import { getDataStore } from './auth.svelte'
import type { Activity, ActivityDoc } from './types'

// Create a new activity
export async function createActivity(activity: Activity): Promise<ActivityDoc> {
  const dataStore = getDataStore()
  const doc = {
    ...activity,
    from: activity.from || Date.now(),
    to: activity.to || null,
  }

  return dataStore.saveActivity(doc)
}

// Update an existing activity
export async function updateActivity(activity: ActivityDoc): Promise<ActivityDoc> {
  const dataStore = getDataStore()
  return dataStore.saveActivity(activity)
}

// Delete an activity
export async function deleteActivity(id: string): Promise<void> {
  const dataStore = getDataStore()
  await dataStore.deleteActivity(id)
}

// Get a single activity by ID
export async function getActivity(id: string): Promise<ActivityDoc | null> {
  const dataStore = getDataStore()
  return dataStore.getActivityById(id) || null
}

// Get all activities
export async function getAllActivities(): Promise<ActivityDoc[]> {
  const dataStore = getDataStore()
  return dataStore.activities
}

// Get running activities (where to === null)
export async function getRunningActivities(): Promise<ActivityDoc[]> {
  const dataStore = getDataStore()
  return dataStore.getActivities({ running: true })
}

// Stop an activity (set to = now)
export async function stopActivity(id: string): Promise<ActivityDoc> {
  const dataStore = getDataStore()
  return dataStore.updateActivity(id, { to: Date.now() })
}

// Get activities for a specific date range
export async function getActivitiesInRange(
  startDate: number,
  endDate: number
): Promise<ActivityDoc[]> {
  const all = await getAllActivities()
  return all.filter((activity) => {
    // Include if activity starts within range OR is still running and started before end
    return (
      (activity.from >= startDate && activity.from <= endDate) ||
      (activity.to === null && activity.from <= endDate) ||
      (activity.to !== null && activity.to >= startDate && activity.from <= endDate)
    )
  })
}

// Get activities for today
export async function getTodayActivities(): Promise<ActivityDoc[]> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1

  return getActivitiesInRange(startOfDay, endOfDay)
}

// Calculate total time for a tag today
export function calculateTagTotals(activities: ActivityDoc[]): Map<string, number> {
  const totals = new Map<string, number>()

  for (const activity of activities) {
    const duration = activity.to ? activity.to - activity.from : Date.now() - activity.from

    for (const tag of activity.tags) {
      const current = totals.get(tag) || 0
      totals.set(tag, current + duration)
    }
  }

  return totals
}

// Calculate total time for each task
export function calculateTaskTotals(activities: ActivityDoc[]): Map<string, number> {
  const totals = new Map<string, number>()

  for (const activity of activities) {
    const duration = activity.to ? activity.to - activity.from : Date.now() - activity.from
    const current = totals.get(activity.task) || 0
    totals.set(activity.task, current + duration)
  }

  return totals
}

// Format milliseconds to human readable duration
export function formatDuration(ms: number): string {
  // Ensure we never show negative durations
  const duration = Math.max(0, ms)

  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Get unique tasks from activities (for autocomplete)
export function getUniqueTasks(activities: ActivityDoc[]): string[] {
  const tasks = new Set<string>()
  for (const activity of activities) {
    tasks.add(activity.task)
  }
  return Array.from(tasks).sort()
}

// Get unique tags from activities (for autocomplete)
export function getUniqueTags(activities: ActivityDoc[]): string[] {
  const tags = new Set<string>()
  for (const activity of activities) {
    for (const tag of activity.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
}

// Get most common tags for each task (for smart autocomplete)
export function getTaskToTagsMap(activities: ActivityDoc[]): Map<string, string[]> {
  const taskTagCounts = new Map<string, Map<string, number>>()

  // Count tag occurrences for each task
  for (const activity of activities) {
    if (!taskTagCounts.has(activity.task)) {
      taskTagCounts.set(activity.task, new Map())
    }

    const tagCounts = taskTagCounts.get(activity.task)!
    for (const tag of activity.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // For each task, get tags sorted by frequency
  const taskToTags = new Map<string, string[]>()
  for (const [task, tagCounts] of taskTagCounts.entries()) {
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([tag]) => tag)
    taskToTags.set(task, sortedTags)
  }

  return taskToTags
}
