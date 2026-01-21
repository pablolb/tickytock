<script lang="ts">
  import {
    getActivityStore,
    formatDuration,
    formatFilterDescription,
    type ActivityFilter,
  } from '../lib/activityStore.svelte'
  import { getFilterStore } from '../lib/filterStore.svelte'
  import { getLocalDateString } from '../lib/dateUtils'
  import PageLayout from './PageLayout.svelte'
  import FilterPanel from './FilterPanel.svelte'
  import Offcanvas from './Offcanvas.svelte'
  import { IconAdjustments } from '@tabler/icons-svelte'
  import ApexChart from './ApexChart.svelte'

  const store = getActivityStore()
  const filterStore = getFilterStore()

  // Calculate stats from filtered activities
  let stats = $derived.by(() => {
    // Default to today if no filter
    if (Object.keys(filterStore.currentFilter).length === 0) {
      return store.todayStats
    }

    // Filter activities
    const activities = store.filterActivities(filterStore.currentFilter)

    // Calculate totals
    let totalDuration = 0
    const taskTotals = new Map<string, number>()
    const tagTotals = new Map<string, number>()

    for (const activity of activities) {
      const end = activity.to ?? Date.now()
      const duration = Math.max(0, end - activity.from)

      totalDuration += duration

      // Task totals
      const currentTask = taskTotals.get(activity.task) || 0
      taskTotals.set(activity.task, currentTask + duration)

      // Tag totals
      for (const tag of activity.tags) {
        const currentTag = tagTotals.get(tag) || 0
        tagTotals.set(tag, currentTag + duration)
      }
    }

    return {
      totalDuration,
      taskTotals,
      tagTotals,
      activities,
    }
  })

  // Sorted task/tag arrays for display
  let sortedTasks = $derived(Array.from(stats.taskTotals.entries()).sort((a, b) => b[1] - a[1]))
  let sortedTags = $derived(Array.from(stats.tagTotals.entries()).sort((a, b) => b[1] - a[1]))

  let filterDescription = $derived(formatFilterDescription(filterStore.currentFilter))

  // Parse filter description for display
  let dateLabel = $derived(filterStore.currentFilter.dateRange?.label || 'All time')
  let formattedDate = $derived(
    filterDescription.includes('=') ? filterDescription.split('=')[1].trim() : filterDescription
  )

  // Count active filters
  let activeFilterCount = $derived.by(() => {
    let count = 0
    const filter = filterStore.currentFilter

    // Only count dateRange if it's not "All time"
    if (filter.dateRange && filter.dateRange.label !== 'All time') count++
    if (filter.taskContains) count++
    if (filter.includeTags && filter.includeTags.length > 0) count++
    if (filter.excludeTags && filter.excludeTags.length > 0) count++

    return count
  })

  // Calculate number of days in range for average calculation
  let numberOfDays = $derived.by(() => {
    if (!filterStore.currentFilter.dateRange) {
      return 1 // Today = 1 day
    }

    let { from, to } = filterStore.currentFilter.dateRange

    // If "All time" (null, null), use actual activity date range
    if (from === null || to === null) {
      if (stats.activities.length === 0) return 1

      // Get min and max dates from actual activities
      const minDate = Math.min(...stats.activities.map((a) => a.from))
      const maxDate = Math.max(...stats.activities.map((a) => a.to ?? Date.now()))

      from = minDate
      to = maxDate
    }

    // Count calendar days: same day = 1, consecutive days = 2, etc.
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const fromDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
    const toDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.round((toDay.getTime() - fromDay.getTime()) / msPerDay) + 1
    return Math.max(1, days)
  })

  let avgPerDay = $derived(numberOfDays > 1 ? stats.totalDuration / numberOfDays : 0)

  // Calculate avg per weekday (when range >= 7 days)
  let avgPerWeekday = $derived.by(() => {
    if (numberOfDays < 7) return 0

    // Count weekdays in the range
    let weekdayCount = 0
    let weekdayDuration = 0

    for (const activity of stats.activities) {
      const date = new Date(activity.from)
      const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Skip weekends (Sunday = 0, Saturday = 6)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const end = activity.to ?? Date.now()
      const duration = Math.max(0, end - activity.from)
      weekdayDuration += duration
    }

    // Count unique weekdays in the date range
    const uniqueDays = new Set<string>()

    // Determine the actual date range to use
    let rangeFrom: number | null = null
    let rangeTo: number | null = null

    if (filterStore.currentFilter.dateRange) {
      rangeFrom = filterStore.currentFilter.dateRange.from
      rangeTo = filterStore.currentFilter.dateRange.to
    }

    // If "All time" (null, null), use actual activity date range
    if (rangeFrom === null || rangeTo === null) {
      if (stats.activities.length > 0) {
        rangeFrom = Math.min(...stats.activities.map((a) => a.from))
        rangeTo = Math.max(...stats.activities.map((a) => a.to ?? Date.now()))
      }
    }

    if (rangeFrom !== null && rangeTo !== null) {
      for (let d = new Date(rangeFrom); d <= new Date(rangeTo); d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          uniqueDays.add(getLocalDateString(d))
        }
      }
      weekdayCount = uniqueDays.size
    }

    return weekdayCount > 0 ? weekdayDuration / weekdayCount : 0
  })

  // Calculate daily data by tag for stacked column chart
  let dailyData = $derived.by(() => {
    if (numberOfDays <= 1) return null

    // Map of date -> tag -> duration
    const dayTagMap = new Map<string, Map<string, number>>()
    const allTags = new Set<string>()

    for (const activity of stats.activities) {
      const date = new Date(activity.from)
      const dateKey = getLocalDateString(date) // YYYY-MM-DD in local timezone

      const end = activity.to ?? Date.now()
      const duration = Math.max(0, end - activity.from)

      if (!dayTagMap.has(dateKey)) {
        dayTagMap.set(dateKey, new Map())
      }

      const tagMap = dayTagMap.get(dateKey)!

      // Add duration to each tag
      for (const tag of activity.tags) {
        allTags.add(tag)
        const current = tagMap.get(tag) || 0
        tagMap.set(tag, current + duration)
      }

      // If no tags, add to "Untagged"
      if (activity.tags.length === 0) {
        allTags.add('Untagged')
        const current = tagMap.get('Untagged') || 0
        tagMap.set('Untagged', current + duration)
      }
    }

    // Sort days by date (all days, not just last 30)
    const sortedDays = Array.from(dayTagMap.keys()).sort((a, b) => a.localeCompare(b))

    // Sort tags by total duration (descending)
    const tagTotals = new Map<string, number>()
    for (const tagMap of dayTagMap.values()) {
      for (const [tag, duration] of tagMap.entries()) {
        tagTotals.set(tag, (tagTotals.get(tag) || 0) + duration)
      }
    }
    const sortedTags = Array.from(tagTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)

    // Build series data for each tag (keep in milliseconds for tooltip formatting)
    const series = sortedTags.map((tag) => ({
      name: tag,
      data: sortedDays.map((date) => {
        const tagMap = dayTagMap.get(date)
        const duration = tagMap?.get(tag) || 0
        return duration // Keep in milliseconds
      }),
    }))

    return {
      labels: sortedDays,
      series,
      tags: sortedTags,
    }
  })

  // ApexCharts options for daily stacked column chart
  let dailyChartOptions = $derived(
    dailyData
      ? {
          series: dailyData.series,
          chart: {
            type: 'bar',
            stacked: true,
          },
          plotOptions: {
            bar: {
              columnWidth: '50%',
            },
          },
          dataLabels: {
            enabled: false,
          },
          stroke: {
            width: 2,
            colors: ['transparent'],
          },
          xaxis: {
            categories: dailyData.labels,
            type: 'datetime',
            labels: {
              format: 'MMM dd',
              padding: 0,
              style: {
                colors: 'var(--tblr-body-color)',
              },
            },
            axisBorder: {
              show: false,
            },
          },
          yaxis: {
            labels: {
              padding: 4,
              formatter: (val: number) => {
                const hours = Math.floor(val / (1000 * 60 * 60))
                const minutes = Math.floor((val % (1000 * 60 * 60)) / (1000 * 60))
                if (hours > 0) {
                  return `${hours}h ${minutes}m`
                }
                return `${minutes}m`
              },
              style: {
                colors: 'var(--tblr-body-color)',
              },
            },
          },
          tooltip: {
            theme: 'dark',
            y: {
              formatter: (val: number) => {
                const hours = Math.floor(val / (1000 * 60 * 60))
                const minutes = Math.floor((val % (1000 * 60 * 60)) / (1000 * 60))
                if (hours > 0) {
                  return `${hours}h ${minutes}m`
                }
                return `${minutes}m`
              },
            },
          },
          grid: {
            padding: {
              top: -20,
              right: 0,
              left: -4,
              bottom: -4,
            },
            strokeDashArray: 4,
          },
          colors: [
            'var(--tblr-primary)',
            'var(--tblr-green)',
            'var(--tblr-yellow)',
            'var(--tblr-red)',
            'var(--tblr-purple)',
            'var(--tblr-blue)',
            'var(--tblr-cyan)',
            'var(--tblr-orange)',
            'var(--tblr-pink)',
            'var(--tblr-indigo)',
          ],
          legend: {
            show: true,
            position: 'bottom',
            offsetY: 12,
            markers: {
              width: 10,
              height: 10,
              radius: 100,
            },
            itemMargin: {
              horizontal: 8,
              vertical: 8,
            },
            labels: {
              colors: 'var(--tblr-body-color)',
            },
          },
        }
      : null
  )

  // Max values for progress bar scaling
  let maxTaskValue = $derived(sortedTasks.length > 0 ? sortedTasks[0][1] : 0)
  let maxTagValue = $derived(sortedTags.length > 0 ? sortedTags[0][1] : 0)

  // Color palette for tags
  const tagColors = [
    'var(--tblr-primary)',
    'var(--tblr-green)',
    'var(--tblr-yellow)',
    'var(--tblr-red)',
    'var(--tblr-purple)',
    'var(--tblr-blue)',
    'var(--tblr-cyan)',
  ]

  function getTagColor(index: number): string {
    return tagColors[index % tagColors.length]
  }

  /**
   * Apply filter
   */
  function handleApplyFilter(filter: ActivityFilter) {
    filterStore.setFilter(filter)
    filterStore.setShowFilters(false)
  }

  /**
   * Clear filter
   */
  function handleClearFilter() {
    filterStore.clearFilter()
    filterStore.setShowFilters(false)
  }
</script>

<PageLayout>
  <!-- Page Header -->
  <div class="page-header">
    <div class="row align-items-center">
      <div class="col">
        <h2 class="page-title">Statistics</h2>
      </div>
      <div class="col-auto">
        <button
          type="button"
          class="btn btn-ghost-secondary position-relative"
          onclick={() => filterStore.toggleFilters()}
          aria-label="Filters"
        >
          <IconAdjustments class="me-1" />
          Filters
          {#if activeFilterCount > 0}
            <span class="badge badge-sm bg-red ms-2">{activeFilterCount}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Date Range Card -->
  <div class="card mb-3">
    <div class="card-body">
      <div class="row align-items-center">
        <div class="col">
          <div class="subheader">{formattedDate}</div>
          <div class="h1 mb-0">{dateLabel}</div>
          <div class="text-secondary mt-2">{stats.activities.length} activities</div>
        </div>
        {#if Object.keys(filterStore.currentFilter).length > 0 && dateLabel !== 'All time'}
          <div class="col-auto">
            <button class="btn btn-outline-secondary btn-sm" onclick={handleClearFilter}>
              Clear
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Total Time Card -->
  {#if numberOfDays < 7}
    <div class="card mb-3">
      <div class="card-body">
        <div class="subheader">Total Time</div>
        <div class="h1 mb-0">{formatDuration(stats.totalDuration)}</div>
        {#if numberOfDays > 1}
          <div class="text-secondary mt-2">
            {formatDuration(avgPerDay)} avg per day ({numberOfDays} days)
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="row row-deck mb-3">
      <div class="col-sm-6">
        <div class="card">
          <div class="card-body">
            <div class="subheader">Total Time</div>
            <div class="h1 mb-0">{formatDuration(stats.totalDuration)}</div>
            <div class="text-secondary mt-2">
              {formatDuration(avgPerDay)} avg per day ({numberOfDays} days)
            </div>
          </div>
        </div>
      </div>
      {#if avgPerWeekday > 0}
        <div class="col-sm-6">
          <div class="card">
            <div class="card-body">
              <div class="subheader">Weekday Average</div>
              <div class="h1 mb-0">{formatDuration(avgPerWeekday)}</div>
              <div class="text-secondary mt-2">
                Monday to Friday only ({numberOfDays} days)
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Activity Summary (Daily Stacked Column Chart by Tag) -->
  {#if dailyChartOptions && dailyData && dailyData.labels.length > 1}
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">Activity Summary</h3>
        <div class="card-subtitle">Daily time tracked by tag ({dailyData.labels.length} days)</div>
      </div>
      <div class="card-body">
        <ApexChart options={dailyChartOptions} type="bar" height={280} />
      </div>
    </div>
  {/if}

  <!-- By Tag -->
  {#if sortedTags.length > 0}
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">By Tag</h3>
      </div>
      <div class="card-table table-responsive">
        <table class="table table-vcenter">
          <thead>
            <tr>
              <th>Tag</th>
              <th class="text-end">Duration</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedTags as [tag, duration], index}
              <tr>
                <td>{tag}</td>
                <td class="text-end">
                  <div class="d-flex align-items-center justify-content-end gap-2">
                    <div class="text-secondary">
                      {formatDuration(duration)}
                      <span class="text-muted ms-1">
                        ({Math.round((duration / stats.totalDuration) * 100)}%)
                      </span>
                    </div>
                    <div class="progress" style="width: 5rem; height: 0.5rem;">
                      <div
                        class="progress-bar"
                        style="width: {(duration / maxTagValue) *
                          100}%; background-color: {getTagColor(index)};"
                        role="progressbar"
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- By Task -->
  {#if sortedTasks.length > 0}
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">By Task</h3>
      </div>
      <div class="card-table table-responsive">
        <table class="table table-vcenter">
          <thead>
            <tr>
              <th>Task</th>
              <th class="text-end">Duration</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedTasks as [task, duration]}
              <tr>
                <td>{task}</td>
                <td class="text-end">
                  <div class="d-flex align-items-center justify-content-end gap-2">
                    <div class="text-secondary">
                      {formatDuration(duration)}
                      <span class="text-muted ms-1">
                        ({Math.round((duration / stats.totalDuration) * 100)}%)
                      </span>
                    </div>
                    <div class="progress" style="width: 5rem; height: 0.5rem;">
                      <div
                        class="progress-bar"
                        style="width: {(duration / maxTaskValue) *
                          100}%; background-color: var(--tblr-primary);"
                        role="progressbar"
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if sortedTags.length === 0 && sortedTasks.length === 0}
    <div class="card">
      <div class="card-body text-center py-5">
        <p class="text-secondary fs-5 mb-2">No activities to show</p>
        <small class="text-muted">Start tracking time or adjust your filters</small>
      </div>
    </div>
  {/if}
</PageLayout>

<!-- Filters Offcanvas -->
<Offcanvas bind:show={filterStore.showFilters} title="Filters" position="end">
  <FilterPanel
    currentFilter={filterStore.currentFilter}
    onApply={handleApplyFilter}
    onClear={handleClearFilter}
  />
</Offcanvas>
