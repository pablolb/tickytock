import type { ActivityFilter } from './activityStore.svelte'
import { getTodayRange, getAllTimeRange } from './dateUtils'

/**
 * Shared filter store that persists between Stats and Activities pages
 */
class FilterStore {
  private _currentFilter = $state<ActivityFilter>({ dateRange: getTodayRange() })
  showFilters = $state(false)

  get currentFilter(): ActivityFilter {
    return this._currentFilter
  }

  setFilter(filter: ActivityFilter) {
    this._currentFilter = filter
  }

  clearFilter() {
    this._currentFilter = { dateRange: getAllTimeRange() }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters
  }

  setShowFilters(show: boolean) {
    this.showFilters = show
  }
}

// Singleton instance
let filterStore: FilterStore | null = null

export function getFilterStore(): FilterStore {
  if (!filterStore) {
    filterStore = new FilterStore()
  }
  return filterStore
}
