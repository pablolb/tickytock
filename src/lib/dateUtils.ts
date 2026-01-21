/**
 * Date range type for filters
 */
export interface DateRange {
  from: number | null // timestamp, null = all time
  to: number | null // timestamp, null = all time
  label?: string // optional label like "Today", "This Week", "All time"
}

/**
 * Helper function to get local date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Helper function to get local time string in HH:MM format
 */
export function getLocalTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Get start of day in local timezone (00:00:00.000)
 */
export function getStartOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Get end of day in local timezone (23:59:59.999)
 */
export function getEndOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC)
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the date range for today
 */
export function getTodayRange(now: Date = new Date()): DateRange {
  const from = getStartOfDay(now)
  const to = getEndOfDay(now)
  return { from, to, label: 'Today' }
}

/**
 * Get the date range for yesterday
 */
export function getYesterdayRange(now: Date = new Date()): DateRange {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const from = getStartOfDay(yesterday)
  const to = getEndOfDay(yesterday)
  return { from, to, label: 'Yesterday' }
}

/**
 * Get the date range for this week (Monday to Sunday)
 * Week starts on Monday and ends on Sunday
 */
export function getThisWeekRange(now: Date = new Date()): DateRange {
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days to subtract to get to Monday
  // Sunday (0) -> subtract 6 days
  // Monday (1) -> subtract 0 days
  // Tuesday (2) -> subtract 1 day
  // etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(now)
  monday.setDate(monday.getDate() - daysFromMonday)

  const from = getStartOfDay(monday)
  const to = now.getTime() // Current moment

  return { from, to, label: 'This Week' }
}

/**
 * Get the date range for last week (Monday to Sunday)
 */
export function getLastWeekRange(now: Date = new Date()): DateRange {
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Get to this Monday, then go back 7 days to last Monday
  const lastMonday = new Date(now)
  lastMonday.setDate(lastMonday.getDate() - daysFromMonday - 7)

  // Last Sunday is 6 days after last Monday
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastSunday.getDate() + 6)

  const from = getStartOfDay(lastMonday)
  const to = getEndOfDay(lastSunday)

  return { from, to, label: 'Last Week' }
}

/**
 * Get the date range for this month (1st to current moment)
 */
export function getThisMonthRange(now: Date = new Date()): DateRange {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = getStartOfDay(firstDay)
  const to = now.getTime()
  return { from, to, label: 'This Month' }
}

/**
 * Get the date range for last month (1st to last day)
 */
export function getLastMonthRange(now: Date = new Date()): DateRange {
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0) // Day 0 = last day of previous month

  const from = getStartOfDay(firstDay)
  const to = getEndOfDay(lastDay)

  return { from, to, label: 'Last Month' }
}

/**
 * Get the "All time" date range (no filtering)
 */
export function getAllTimeRange(): DateRange {
  return { from: null, to: null, label: 'All time' }
}

/**
 * Format a date range for display
 * Examples:
 *   - "Jan 12 - Jan 18"
 *   - "Dec 25 - Jan 5" (crosses year boundary, shows both years)
 *   - "Jan 15" (single day)
 */
export function formatDateRange(from: number | null, to: number | null): string {
  // Handle "all time" case
  if (from === null || to === null) {
    return 'All time'
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  // Check if it's the same day
  if (fromDate.toDateString() === toDate.toDateString()) {
    return fromDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Check if same year
  if (fromDate.getFullYear() === toDate.getFullYear()) {
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  // Different years
  return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

/**
 * Check if a date range matches today
 */
export function isToday(range: DateRange, now: Date = new Date()): boolean {
  const today = getTodayRange(now)
  return (
    range.from !== null &&
    range.to !== null &&
    today.from !== null &&
    today.to !== null &&
    range.from === today.from &&
    range.to <= today.to
  )
}

/**
 * Check if a date range matches yesterday
 */
export function isYesterday(range: DateRange, now: Date = new Date()): boolean {
  const yesterday = getYesterdayRange(now)
  return (
    range.from !== null &&
    range.to !== null &&
    yesterday.from !== null &&
    yesterday.to !== null &&
    range.from === yesterday.from &&
    range.to <= yesterday.to
  )
}
