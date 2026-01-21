import { getDataStore, getAppState } from './auth.svelte'
import type { ActivityDoc } from './types'
import type { DateRange } from './dateUtils'
import { formatDateRange } from './dateUtils'

/**
 * Pre-calculated statistics for a date range
 */
export interface ActivityStats {
  activities: ActivityDoc[]
  totalDuration: number // milliseconds
  taskTotals: Map<string, number> // task -> duration
  tagTotals: Map<string, number> // tag -> duration
  runningActivities: ActivityDoc[]
}

/**
 * Filter for activities
 */
export interface ActivityFilter {
  dateRange?: DateRange | null // undefined = today, null = all time, DateRange = specific range
  taskContains?: string
  includeTags?: string[]
  excludeTags?: string[]
  showRunning?: boolean
}

/**
 * Format filter description for display
 * Examples:
 *   - "This Week = Jan 12 - Jan 18"
 *   - "All time"
 *   - "Yesterday = Jan 11, 2024 · task: 'meeting'"
 */
export function formatFilterDescription(filter: ActivityFilter): string {
  const parts: string[] = []

  // Date range - show label with actual dates
  if (filter.dateRange) {
    const formattedRange = formatDateRange(filter.dateRange.from, filter.dateRange.to)
    if (filter.dateRange.label && filter.dateRange.label !== formattedRange) {
      // Show both label and dates (e.g., "This Week = 12 Jan - 18 Jan")
      parts.push(`${filter.dateRange.label} = ${formattedRange}`)
    } else {
      // Just show the formatted range
      parts.push(formattedRange)
    }
  } else {
    // No dateRange = default to Today
    return 'Today'
  }

  // Task search
  if (filter.taskContains) {
    parts.push(`task: "${filter.taskContains}"`)
  }

  // Include tags
  if (filter.includeTags && filter.includeTags.length > 0) {
    parts.push(`tags: ${filter.includeTags.join(', ')}`)
  }

  // Exclude tags
  if (filter.excludeTags && filter.excludeTags.length > 0) {
    parts.push(`exclude: ${filter.excludeTags.join(', ')}`)
  }

  return parts.join(' · ')
}

/**
 * Recent task info (for quick-start UI)
 */
export interface RecentTask {
  task: string
  tags: string[]
  lastUsed: number // timestamp
}

/**
 * Reactive ActivityStore - provides high-level API for components
 *
 * Features:
 * - Pre-calculated stats (today, yesterday, week, month)
 * - Auto-updating every 10s for running activities
 * - Smart date boundary detection (recalc when day changes)
 * - Recent tasks for quick-start UI
 *
 * Data flow:
 * 1. DataStore has raw activities in $state (updated by encrypted-pouch events)
 * 2. ActivityStore uses $derived to compute stats reactively
 * 3. Ticker updates _now every 10s to refresh durations
 * 4. Components read reactive getters, auto-update when data changes
 */
export class ActivityStore {
  // Current time (updates every 10s)
  private _now = $state(Date.now())

  // Last date we calculated stats for (to detect day changes)
  private _lastCalcDate = $state(new Date().toDateString())

  // Ticker interval ID
  private tickerInterval?: number

  constructor() {
    // Start ticker to update running activity durations
    this.startTicker()
  }

  /**
   * Start ticker - updates every 10s
   */
  private startTicker() {
    this.tickerInterval = window.setInterval(() => {
      this._now = Date.now()

      // Check if date changed (midnight passed)
      const currentDate = new Date().toDateString()
      if (currentDate !== this._lastCalcDate) {
        this._lastCalcDate = currentDate
        // _now update will trigger all $derived to recalculate
      }
    }, 10000) // 10 seconds
  }

  /**
   * Stop ticker (cleanup)
   */
  destroy() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval)
    }
  }

  /**
   * Get all activities (from DataStore)
   * Returns empty array if app is locked
   */
  get activities(): ActivityDoc[] {
    const appState = getAppState()
    if (appState.status !== 'unlocked') {
      return []
    }
    const dataStore = getDataStore()
    return dataStore.activities
  }

  /**
   * Get running activities (reactive)
   */
  get runningActivities(): ActivityDoc[] {
    // Reference _now to trigger updates
    void this._now
    return this.activities.filter((a) => a.to === null)
  }

  /**
   * Today's date range
   */
  private get todayRange(): DateRange {
    // Reference _now to detect day changes
    void this._now

    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const to = from + 24 * 60 * 60 * 1000 - 1
    return { from, to }
  }

  /**
   * Yesterday's date range
   */
  private get yesterdayRange(): DateRange {
    void this._now

    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const from = yesterday.getTime()
    const to = from + 24 * 60 * 60 * 1000 - 1
    return { from, to }
  }

  /**
   * This week's date range (Monday to Sunday)
   */
  private get thisWeekRange(): DateRange {
    void this._now

    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1)
    const from = monday.getTime()
    const to = from + 7 * 24 * 60 * 60 * 1000 - 1
    return { from, to }
  }

  /**
   * This month's date range
   */
  private get thisMonthRange(): DateRange {
    void this._now

    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
    return { from, to }
  }

  /**
   * Today's stats (reactive, auto-updates)
   */
  get todayStats(): ActivityStats {
    return this.calculateStats(this.todayRange)
  }

  /**
   * Yesterday's stats (reactive)
   */
  get yesterdayStats(): ActivityStats {
    return this.calculateStats(this.yesterdayRange)
  }

  /**
   * This week's stats (reactive)
   */
  get thisWeekStats(): ActivityStats {
    return this.calculateStats(this.thisWeekRange)
  }

  /**
   * This month's stats (reactive)
   */
  get thisMonthStats(): ActivityStats {
    return this.calculateStats(this.thisMonthRange)
  }

  /**
   * Get recent tasks (latest 5 unique tasks from all history)
   * Perfect for quick-start UI at the beginning of the day!
   */
  get recentTasks(): RecentTask[] {
    const taskMap = new Map<string, RecentTask>()

    // Process activities from most recent to oldest
    const sorted = [...this.activities].sort((a, b) => b.from - a.from)

    for (const activity of sorted) {
      if (!taskMap.has(activity.task)) {
        taskMap.set(activity.task, {
          task: activity.task,
          tags: activity.tags,
          lastUsed: activity.from,
        })
      }

      // Stop once we have 5 unique tasks
      if (taskMap.size >= 5) break
    }

    return Array.from(taskMap.values())
  }

  /**
   * Calculate stats for a date range (reactive helper)
   */
  private calculateStats(range: DateRange): ActivityStats {
    // Reference _now to update durations of running activities
    const now = this._now

    // Filter activities in range
    const activities = this.activities.filter((a) => {
      // If range has null values (all time), include all activities
      if (range.from === null || range.to === null) return true

      // Activity starts within range
      if (a.from >= range.from && a.from <= range.to) return true

      // Activity is running and started before end of range
      if (a.to === null && a.from <= range.to) return true

      // Activity spans across the range
      if (a.to !== null && a.to >= range.from && a.from <= range.to) return true

      return false
    })

    // Calculate totals
    let totalDuration = 0
    const taskTotals = new Map<string, number>()
    const tagTotals = new Map<string, number>()
    const runningActivities: ActivityDoc[] = []

    for (const activity of activities) {
      // Calculate duration (use current time for running activities)
      const end = activity.to ?? now
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

      // Track running activities
      if (activity.to === null) {
        runningActivities.push(activity)
      }
    }

    return {
      activities,
      totalDuration,
      taskTotals,
      tagTotals,
      runningActivities,
    }
  }

  /**
   * Filter activities with advanced criteria
   */
  filterActivities(filter: ActivityFilter): ActivityDoc[] {
    let filtered = this.activities

    // Date range filter
    if (filter.dateRange) {
      const { from, to } = filter.dateRange
      // Skip filtering if from/to are null (all time)
      if (from !== null && to !== null) {
        filtered = filtered.filter((a) => {
          if (a.from >= from && a.from <= to) return true
          if (a.to === null && a.from <= to) return true
          if (a.to !== null && a.to >= from && a.from <= to) return true
          return false
        })
      }
    }

    // Task contains filter
    if (filter.taskContains) {
      const search = filter.taskContains.toLowerCase()
      filtered = filtered.filter((a) => a.task.toLowerCase().includes(search))
    }

    // Include tags filter (must have ALL)
    if (filter.includeTags && filter.includeTags.length > 0) {
      filtered = filtered.filter((a) => filter.includeTags!.every((tag) => a.tags.includes(tag)))
    }

    // Exclude tags filter (must have NONE)
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      filtered = filtered.filter((a) => !filter.excludeTags!.some((tag) => a.tags.includes(tag)))
    }

    // Running filter
    if (filter.showRunning !== undefined) {
      if (filter.showRunning) {
        filtered = filtered.filter((a) => a.to === null)
      } else {
        filtered = filtered.filter((a) => a.to !== null)
      }
    }

    return filtered
  }

  /**
   * Get unique tasks
   * Returns empty array if app is locked
   */
  get uniqueTasks(): string[] {
    const appState = getAppState()
    if (appState.status !== 'unlocked') {
      return []
    }
    const tasks = new Set<string>()
    for (const activity of this.activities) {
      tasks.add(activity.task)
    }
    return Array.from(tasks).sort()
  }

  /**
   * Get unique tags
   * Returns empty array if app is locked
   */
  get uniqueTags(): string[] {
    const appState = getAppState()
    if (appState.status !== 'unlocked') {
      return []
    }
    const tags = new Set<string>()
    for (const activity of this.activities) {
      for (const tag of activity.tags) {
        tags.add(tag)
      }
    }
    return Array.from(tags).sort()
  }

  /**
   * Get most common tags for a task (for smart autocomplete)
   */
  getTagsForTask(taskName: string): string[] {
    const tagCounts = new Map<string, number>()

    // Count tag occurrences for this task
    for (const activity of this.activities) {
      if (activity.task === taskName) {
        for (const tag of activity.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
      }
    }

    // Return tags sorted by frequency
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }

  // === Mutations (delegate to DataStore) ===

  /**
   * Create new activity
   */
  async createActivity(activity: {
    task: string
    tags: string[]
    from?: number
    to?: number | null
  }): Promise<ActivityDoc> {
    const dataStore = getDataStore()
    return dataStore.saveActivity({
      task: activity.task,
      tags: activity.tags,
      from: activity.from || Date.now(),
      to: activity.to ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  /**
   * Update activity
   */
  async updateActivity(
    id: string,
    updates: Partial<{ task: string; tags: string[]; from: number; to: number | null }>
  ): Promise<ActivityDoc> {
    const dataStore = getDataStore()
    return dataStore.updateActivity(id, updates)
  }

  /**
   * Delete activity
   */
  async deleteActivity(id: string): Promise<void> {
    const dataStore = getDataStore()
    return dataStore.deleteActivity(id)
  }

  /**
   * Stop running activity
   */
  async stopActivity(id: string): Promise<ActivityDoc> {
    const dataStore = getDataStore()
    return dataStore.updateActivity(id, { to: Date.now() })
  }

  /**
   * Start new activity (and optionally auto-stop running ones)
   */
  async startActivity(
    task: string,
    tags: string[],
    autoStopRunning: boolean = true
  ): Promise<ActivityDoc> {
    // Auto-stop running activities if enabled
    if (autoStopRunning) {
      const running = this.runningActivities
      for (const activity of running) {
        await this.stopActivity(activity._id)
      }
    }

    // Create new activity with current timezone
    return this.createActivity({
      task,
      tags,
      from: Date.now(),
      to: null,
    })
  }
}

/**
 * Format timestamp with timezone
 *
 * Example usage:
 *   const activity = { from: 1736618725000, timezone: 'America/New_York' }
 *   formatTimestampWithTimezone(activity.from, activity.timezone)
 *   // => "Jan 15, 2024, 03:45:25 PM EST"
 *
 * If traveling:
 *   Activity created in Tokyo: { from: timestamp, timezone: 'Asia/Tokyo' }
 *   Activity created in NYC:   { from: timestamp, timezone: 'America/New_York' }
 *   Both display correctly in their original timezone
 */
export function formatTimestampWithTimezone(timestamp: number, timezone?: string): string {
  const date = new Date(timestamp)
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  return date.toLocaleString('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const duration = Math.max(0, ms)
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Format duration as decimal hours (e.g., 1.5h)
 */
export function formatDurationDecimal(ms: number): string {
  const duration = Math.max(0, ms)
  const hours = duration / (1000 * 60 * 60)
  return `${hours.toFixed(1)}h`
}

// Singleton instance
let activityStoreInstance: ActivityStore | null = null

/**
 * Get the singleton ActivityStore instance
 */
export function getActivityStore(): ActivityStore {
  if (!activityStoreInstance) {
    activityStoreInstance = new ActivityStore()
  }
  return activityStoreInstance
}
