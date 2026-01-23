import type { Activity } from './types'
import { createAccount as realCreateAccount } from './accounts'
import { getDataStore } from './auth.svelte'

/**
 * E2E Testing API - exposed as window.e2eApi in test mode
 *
 * This provides a backchannel for E2E tests to manipulate app state
 * directly via PouchDB, bypassing the UI.
 */
export class E2EApi {
  /**
   * Create a test account in localStorage
   */
  createAccount(username: string): void {
    realCreateAccount(username)
  }

  /**
   * Store activities directly in the database
   */
  async storeActivities(activities: Activity[]): Promise<void> {
    const dataStore = getDataStore()

    for (const activity of activities) {
      await dataStore.saveActivity(activity)
    }
  }

  /**
   * Clear all activities from the database
   */
  async clearActivities(): Promise<void> {
    const dataStore = getDataStore()
    const activities = dataStore.activities

    for (const activity of activities) {
      await dataStore.deleteActivity(activity._id)
    }
  }

  /**
   * Get all activities (for assertions)
   */
  getActivities(): Activity[] {
    const dataStore = getDataStore()
    return dataStore.activities
  }

  /**
   * Get currently running activity
   */
  getCurrentActivity(): Activity | undefined {
    const dataStore = getDataStore()
    return dataStore.getCurrentActivity()
  }
}

// Export singleton instance
export const e2eApi = new E2EApi()
