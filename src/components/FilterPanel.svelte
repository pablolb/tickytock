<script lang="ts">
  import type { ActivityFilter } from '../lib/activityStore.svelte'
  import type { DateRange } from '../lib/dateUtils'
  import {
    getTodayRange,
    getYesterdayRange,
    getThisWeekRange,
    getLastWeekRange,
    getThisMonthRange,
    getLastMonthRange,
    getAllTimeRange,
    getLocalDateString,
  } from '../lib/dateUtils'

  let {
    currentFilter,
    onApply,
    onClear,
  }: {
    currentFilter: ActivityFilter
    // eslint-disable-next-line no-unused-vars
    onApply: (filter: ActivityFilter) => void
    onClear: () => void
  } = $props()

  // Initialize filter state from currentFilter
  function initializeFromFilter(filter: ActivityFilter) {
    // Determine which preset matches the current dateRange
    let presetValue = 'today'
    if (filter.dateRange) {
      const { from, to, label } = filter.dateRange
      if (from === null && to === null) {
        presetValue = 'all'
      } else if (label === 'Yesterday') {
        presetValue = 'yesterday'
      } else if (label === 'This Week') {
        presetValue = 'week'
      } else if (label === 'Last Week') {
        presetValue = 'lastweek'
      } else if (label === 'This Month') {
        presetValue = 'month'
      } else if (label === 'Last Month') {
        presetValue = 'lastmonth'
      } else if (label === 'Today') {
        presetValue = 'today'
      } else {
        // Custom range
        presetValue = 'custom'
        customDateFrom = getLocalDateString(new Date(from!))
        customDateTo = getLocalDateString(new Date(to!))
      }
    }

    datePreset = presetValue
    taskSearch = filter.taskContains || ''
    includeTagsInput = filter.includeTags?.join(', ') || ''
    excludeTagsInput = filter.excludeTags?.join(', ') || ''
  }

  // Filter state
  let datePreset = $state<string>('today')
  let customDateFrom = $state('')
  let customDateTo = $state('')
  let taskSearch = $state('')
  let includeTagsInput = $state('')
  let excludeTagsInput = $state('')

  // Initialize on mount and when currentFilter changes
  $effect(() => {
    initializeFromFilter(currentFilter)
  })

  // Date presets
  type DatePreset = {
    label: string
    value: string
    getRange: () => DateRange | null
  }

  const datePresets: DatePreset[] = [
    {
      label: 'Today',
      value: 'today',
      getRange: () => getTodayRange(),
    },
    {
      label: 'Yesterday',
      value: 'yesterday',
      getRange: () => getYesterdayRange(),
    },
    {
      label: 'This week',
      value: 'week',
      getRange: () => getThisWeekRange(),
    },
    {
      label: 'Last week',
      value: 'lastweek',
      getRange: () => getLastWeekRange(),
    },
    {
      label: 'This month',
      value: 'month',
      getRange: () => getThisMonthRange(),
    },
    {
      label: 'Last month',
      value: 'lastmonth',
      getRange: () => getLastMonthRange(),
    },
    {
      label: 'All time',
      value: 'all',
      getRange: () => getAllTimeRange(),
    },
    {
      label: 'Custom range',
      value: 'custom',
      getRange: () => {
        if (!customDateFrom || !customDateTo) return null
        const from = new Date(customDateFrom).getTime()
        const to = new Date(customDateTo).getTime() + 24 * 60 * 60 * 1000 - 1
        return { from, to }
      },
    },
  ]

  /**
   * Build filter from current state
   */
  function buildFilter(): ActivityFilter {
    const filter: ActivityFilter = {}

    // Date range
    const preset = datePresets.find((p) => p.value === datePreset)
    const range = preset?.getRange()
    if (range) {
      filter.dateRange = range
    }

    // Task search
    if (taskSearch.trim()) {
      filter.taskContains = taskSearch.trim()
    }

    // Include tags
    const includeTags = includeTagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (includeTags.length > 0) {
      filter.includeTags = includeTags
    }

    // Exclude tags
    const excludeTags = excludeTagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (excludeTags.length > 0) {
      filter.excludeTags = excludeTags
    }

    return filter
  }

  function handleApply() {
    const filter = buildFilter()
    onApply(filter)
  }

  function handleClear() {
    datePreset = 'all'
    customDateFrom = ''
    customDateTo = ''
    taskSearch = ''
    includeTagsInput = ''
    excludeTagsInput = ''
    onClear()
  }
</script>

<div class="offcanvas-body">
  <form
    onsubmit={(e) => {
      e.preventDefault()
      handleApply()
    }}
  >
    <!-- Date Range -->
    <div class="mb-3">
      <label class="form-label" for="date-preset">Date range</label>
      <select id="date-preset" class="form-select" bind:value={datePreset}>
        {#each datePresets as preset}
          <option value={preset.value}>{preset.label}</option>
        {/each}
      </select>
    </div>

    {#if datePreset === 'custom'}
      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label" for="date-from">From</label>
          <input id="date-from" type="date" class="form-control" bind:value={customDateFrom} />
        </div>
        <div class="col-6">
          <label class="form-label" for="date-to">To</label>
          <input id="date-to" type="date" class="form-control" bind:value={customDateTo} />
        </div>
      </div>
    {/if}

    <!-- Task Search -->
    <div class="mb-3">
      <label class="form-label" for="task-search">Task contains</label>
      <input
        id="task-search"
        type="text"
        class="form-control"
        bind:value={taskSearch}
        placeholder="Search by task name..."
      />
    </div>

    <!-- Include Tags -->
    <div class="mb-3">
      <label class="form-label" for="include-tags">Include tags</label>
      <input
        id="include-tags"
        type="text"
        class="form-control"
        bind:value={includeTagsInput}
        placeholder="work, urgent"
      />
      <small class="form-text">Must have ALL these tags (space or comma separated)</small>
    </div>

    <!-- Exclude Tags -->
    <div class="mb-3">
      <label class="form-label" for="exclude-tags">Exclude tags</label>
      <input
        id="exclude-tags"
        type="text"
        class="form-control"
        bind:value={excludeTagsInput}
        placeholder="personal, break"
      />
      <small class="form-text">Must have NONE of these tags (space or comma separated)</small>
    </div>

    <!-- Action Buttons -->
    <div class="d-grid gap-2 mt-4">
      <button type="submit" class="btn btn-primary w-100">Apply Filters</button>
      <button type="button" class="btn btn-secondary w-100" onclick={handleClear}>
        Clear Filters
      </button>
    </div>
  </form>
</div>

<style>
  /* Ensure proper spacing and touch targets on mobile (iOS requirement) */
  .form-control,
  .form-select {
    min-height: 44px;
  }
</style>
