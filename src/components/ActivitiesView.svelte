<script lang="ts">
  import {
    getActivityStore,
    formatDuration,
    formatFilterDescription,
    type ActivityFilter,
  } from '../lib/activityStore.svelte'
  import type { ActivityDoc } from '../lib/types'
  import { getFilterStore } from '../lib/filterStore.svelte'
  import { getLocalDateString } from '../lib/dateUtils'
  import { getToastStore } from '../lib/toastStore.svelte'
  import PageLayout from './PageLayout.svelte'
  import FilterPanel from './FilterPanel.svelte'
  import Offcanvas from './Offcanvas.svelte'
  import ManualActivityForm from './ManualActivityForm.svelte'
  import {
    IconAdjustments,
    IconDotsVertical,
    IconEdit,
    IconPlayerPause,
    IconPlus,
    IconTrash,
  } from '@tabler/icons-svelte'
  const store = getActivityStore()
  const filterStore = getFilterStore()
  const toastStore = getToastStore()

  // State
  let editingActivity = $state<ActivityDoc | null>(null)
  let openDropdownId = $state<string | null>(null)
  let addingActivity = $state(false)

  /**
   * Toggle dropdown for an activity
   */
  function toggleDropdown(activityId: string) {
    openDropdownId = openDropdownId === activityId ? null : activityId
  }

  /**
   * Close dropdown when clicking outside
   */
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.dropdown')) {
      openDropdownId = null
    }
  }

  // Filtered activities (reactive)
  let filteredActivities = $derived.by(() => {
    const filter = filterStore.currentFilter

    // If no dateRange is set, default to today
    if (!filter.dateRange) {
      return store.todayStats.activities
    }

    // Otherwise apply the filter (handles null from/to for all time)
    return store.filterActivities(filter)
  })

  // Group activities by day
  interface DayGroup {
    date: string // YYYY-MM-DD
    displayDate: string // "Today", "Yesterday", "Jan 12, 2026"
    activities: ActivityDoc[]
    totalDuration: number
  }

  let groupedActivities = $derived.by(() => {
    const groups = new Map<string, DayGroup>()

    for (const activity of filteredActivities) {
      const date = new Date(activity.from)
      const dateKey = getLocalDateString(date) // YYYY-MM-DD in local timezone

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          displayDate: formatDateLabel(date),
          activities: [],
          totalDuration: 0,
        })
      }

      const group = groups.get(dateKey)!
      group.activities.push(activity)

      // Calculate duration
      const end = activity.to ?? Date.now()
      const duration = Math.max(0, end - activity.from)
      group.totalDuration += duration
    }

    // Sort groups by date (newest first)
    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date))
  })

  /**
   * Format date label (Today, Yesterday, or date)
   */
  function formatDateLabel(date: Date): string {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateStr = date.toDateString()
    const todayStr = today.toDateString()
    const yesterdayStr = yesterday.toDateString()

    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  /**
   * Format time (e.g., "10:23 AM")
   */
  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  /**
   * Convert Unix timestamp to datetime-local format (YYYY-MM-DDTHH:MM)
   */
  function timestampToDatetimeLocal(timestamp: number): string {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  /**
   * Convert datetime-local format to Unix timestamp
   */
  function datetimeLocalToTimestamp(datetimeLocal: string): number {
    return new Date(datetimeLocal).getTime()
  }

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

  /**
   * Delete activity
   */
  async function handleDelete(activity: ActivityDoc) {
    if (!confirm(`Delete activity "${activity.task}"?`)) return

    openDropdownId = null
    try {
      await store.deleteActivity(activity._id)
    } catch (error) {
      console.error('Failed to delete activity:', error)
      toastStore.error('Failed to delete activity')
    }
  }

  /**
   * Start editing
   */
  function handleEdit(activity: ActivityDoc) {
    openDropdownId = null
    editingActivity = activity
  }

  /**
   * Cancel editing
   */
  function handleCancelEdit() {
    editingActivity = null
  }

  /**
   * Save edited activity
   */
  async function handleSaveEdit() {
    if (!editingActivity) return

    try {
      await store.updateActivity(editingActivity._id, {
        task: editingActivity.task,
        tags: editingActivity.tags,
        from: editingActivity.from,
        to: editingActivity.to,
      })
      editingActivity = null
    } catch (error) {
      console.error('Failed to update activity:', error)
      toastStore.error('Failed to update activity')
    }
  }

  /**
   * Stop running activity
   */
  async function handleStop(activity: ActivityDoc) {
    openDropdownId = null
    try {
      await store.stopActivity(activity._id)
    } catch (error) {
      console.error('Failed to stop activity:', error)
      toastStore.error('Failed to stop activity')
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<PageLayout>
  <!-- Page Header -->
  <div class="page-header">
    <div class="row align-items-center">
      <div class="col">
        <h2 class="page-title">Activities</h2>
      </div>
      <div class="col-auto d-flex gap-2">
        <button
          type="button"
          class="btn btn-ghost-secondary"
          onclick={() => {
            addingActivity = !addingActivity
          }}
          aria-label="Add activity"
        >
          <IconPlus />
        </button>
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
          <div class="text-secondary mt-2">{filteredActivities.length} activities</div>
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

  <!-- Add Activity Form -->
  {#if addingActivity}
    <ManualActivityForm
      onActivityCreated={() => {
        addingActivity = false
      }}
      onCancel={() => {
        addingActivity = false
      }}
    />
  {/if}

  <!-- Grouped Activities -->
  {#if groupedActivities.length === 0}
    <div class="card">
      <div class="card-body text-center py-5">
        <p class="text-secondary fs-5 mb-2">No activities found</p>
        <small class="text-muted">Try adjusting your filters or start tracking time!</small>
      </div>
    </div>
  {:else}
    {#each groupedActivities as group (group.date)}
      <div class="card mb-3">
        <div class="card-header">
          <div class="row align-items-center">
            <div class="col">
              <h3 class="card-title mb-0">{group.displayDate}</h3>
            </div>
            <div class="col-auto">
              <span class="badge bg-azure-lt fs-4">{formatDuration(group.totalDuration)}</span>
            </div>
          </div>
        </div>

        <div class="list-group list-group-flush">
          {#each group.activities as activity (activity._id)}
            {#if editingActivity?._id === activity._id}
              <!-- Edit Mode -->
              <div class="list-group-item border-primary">
                <div class="mb-3">
                  <label class="form-label" for="edit-task-{activity._id}">Task</label>
                  <input
                    id="edit-task-{activity._id}"
                    type="text"
                    class="form-control"
                    bind:value={editingActivity.task}
                    placeholder="Task"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label" for="edit-tags-{activity._id}">Tags</label>
                  <input
                    id="edit-tags-{activity._id}"
                    type="text"
                    class="form-control"
                    value={editingActivity.tags.join(', ')}
                    onchange={(e) => {
                      const target = e.target as HTMLInputElement
                      editingActivity!.tags = target.value
                        .split(/[,\s]+/)
                        .map((t) => t.trim())
                        .filter((t) => t.length > 0)
                    }}
                    placeholder="Tags (comma separated)"
                  />
                </div>

                <div class="row g-3 mb-3">
                  <div class="col-sm-6">
                    <label class="form-label" for="edit-from-{activity._id}">Start time</label>
                    <input
                      id="edit-from-{activity._id}"
                      type="datetime-local"
                      class="form-control"
                      value={timestampToDatetimeLocal(editingActivity.from)}
                      onchange={(e) => {
                        const target = e.target as HTMLInputElement
                        editingActivity!.from = datetimeLocalToTimestamp(target.value)
                      }}
                    />
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label" for="edit-to-{activity._id}">End time</label>
                    <input
                      id="edit-to-{activity._id}"
                      type="datetime-local"
                      class="form-control"
                      value={editingActivity.to ? timestampToDatetimeLocal(editingActivity.to) : ''}
                      onchange={(e) => {
                        const target = e.target as HTMLInputElement
                        editingActivity!.to = target.value
                          ? datetimeLocalToTimestamp(target.value)
                          : null
                      }}
                    />
                  </div>
                </div>

                <div class="btn-list">
                  <button type="button" class="btn btn-primary btn-sm" onclick={handleSaveEdit}>
                    Save
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <!-- View Mode -->
              <div class="list-group-item">
                <div class="row align-items-center">
                  <div class="col">
                    <!-- Task and running badge -->
                    <div class="d-flex align-items-center gap-2 mb-2">
                      <strong class="fs-5">{activity.task}</strong>
                      {#if activity.to === null}
                        <span class="badge bg-success-subtle text-success">Running</span>
                      {/if}
                    </div>

                    <!-- Time info -->
                    <div class="d-flex gap-3 text-secondary small mb-2">
                      <span>
                        {formatTime(activity.from)}
                        {#if activity.to}
                          - {formatTime(activity.to)}
                        {/if}
                      </span>
                      <span class="fw-bold text-primary">
                        {formatDuration(
                          activity.to ? activity.to - activity.from : Date.now() - activity.from
                        )}
                      </span>
                    </div>

                    <!-- Tags -->
                    {#if activity.tags.length > 0}
                      <div class="d-flex gap-1 flex-wrap">
                        {#each activity.tags as tag}
                          <span class="badge badge-outline text-secondary">{tag}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>

                  <!-- Actions Dropdown -->
                  <div class="col-auto">
                    <div class="dropdown">
                      <button
                        class="btn btn-icon"
                        type="button"
                        onclick={() => toggleDropdown(activity._id)}
                        aria-expanded={openDropdownId === activity._id}
                      >
                        <IconDotsVertical />
                      </button>
                      <div
                        class="dropdown-menu dropdown-menu-end {openDropdownId === activity._id
                          ? 'show'
                          : ''}"
                      >
                        {#if activity.to === null}
                          <button
                            type="button"
                            class="dropdown-item"
                            onclick={() => handleStop(activity)}
                          >
                            <IconPlayerPause size={18} class="me-2" />
                            Stop
                          </button>
                        {/if}
                        <button
                          type="button"
                          class="dropdown-item"
                          onclick={() => handleEdit(activity)}
                        >
                          <IconEdit size={18} class="me-2" />
                          Edit
                        </button>
                        <button
                          type="button"
                          class="dropdown-item text-danger"
                          onclick={() => handleDelete(activity)}
                        >
                          <IconTrash size={18} class="me-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
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

<style>
  /* Allow dropdown menus to escape card boundaries */
  .list-group-flush {
    overflow: visible;
  }

  /* Ensure proper touch targets on mobile */
  .btn-icon {
    min-height: 44px;
    min-width: 44px;
  }

  /* Dropdown items with icons */
  .dropdown-item {
    display: flex;
    align-items: center;
  }
</style>
