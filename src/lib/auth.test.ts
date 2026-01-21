import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getAppState,
  isLocked,
  getCurrentUsername,
  unlock,
  lock,
  getDataStore,
} from './auth.svelte'

// Test appId - stable ID for test database isolation
const TEST_APP_ID = 'test-app-id-12345'

// Clean up databases after each test
async function cleanupDatabase(username: string, appId: string = TEST_APP_ID) {
  try {
    // Use indexedDB to delete the database (includes appId in name)
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(`tickytock-${username}-${appId}`)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        request.onblocked = () => resolve() // Resolve anyway if blocked
      })
    }
  } catch (error) {
    console.warn('Failed to cleanup database:', error)
  }
}

describe('Auth State Machine', () => {
  const testUsername = 'testuser'
  const testPassword = 'test-password-123'

  beforeEach(() => {
    // Ensure we start in locked state
    lock()
  })

  afterEach(async () => {
    // Clean up test databases
    lock()
    await cleanupDatabase(testUsername)
  })

  describe('initial state', () => {
    it('should start in locked state', () => {
      expect(getAppState().status).toBe('locked')
      expect(isLocked()).toBe(true)
      expect(getCurrentUsername()).toBeNull()
    })
  })

  describe('unlock()', () => {
    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should transition to unlocked state with valid credentials', async () => {
      await unlock(testUsername, testPassword, TEST_APP_ID)

      expect(getAppState().status).toBe('unlocked')
      expect(isLocked()).toBe(false)
      expect(getCurrentUsername()).toBe(testUsername)

      const appState = getAppState()
      if (appState.status === 'unlocked') {
        expect(appState.dataStore).toBeDefined()
        expect(appState.username).toBe(testUsername)
      }
    })

    it('should throw error with empty username', async () => {
      await expect(unlock('', testPassword)).rejects.toThrow('Username and password are required')
    })

    it('should throw error with empty password', async () => {
      await expect(unlock(testUsername, '')).rejects.toThrow('Username and password are required')
    })

    // NOTE: This test requires real Fireproof/IndexedDB persistence
    // Move to E2E tests once those are set up
    it.skip('should load existing data when unlocking existing account', async () => {
      // First unlock and add some data
      await unlock(testUsername, testPassword, TEST_APP_ID)
      const dataStore1 = getDataStore()

      await dataStore1.saveActivity({
        _id: 'test-activity-1',
        task: 'Test activity',
        tags: ['test'],
        from: Date.now(),
        to: null,
      })

      // Wait for Fireproof to persist
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(dataStore1.activities).toHaveLength(1)

      // Lock and unlock again
      lock()
      await unlock(testUsername, testPassword, TEST_APP_ID)

      const dataStore2 = getDataStore()
      expect(dataStore2.activities.length).toBeGreaterThanOrEqual(1)
      const foundActivity = dataStore2.activities.find((a) => a._id === 'test-activity-1')
      expect(foundActivity).toBeDefined()
      expect(foundActivity?.task).toBe('Test activity')
    })

    // NOTE: This test requires real Fireproof/IndexedDB persistence
    // Move to E2E tests once those are set up
    it.skip('should throw error with wrong passphrase for existing account', async () => {
      // Create account with one password
      await unlock(testUsername, testPassword, TEST_APP_ID)

      // Add some data to ensure database is not empty
      const dataStore = getDataStore()
      await dataStore.saveActivity({
        _id: 'test-activity-auth-1',
        task: 'Test',
        tags: [],
        from: Date.now(),
        to: null,
      })

      // Wait for Fireproof to persist
      await new Promise((resolve) => setTimeout(resolve, 50))

      lock()

      // Try to unlock with wrong password
      await expect(unlock(testUsername, 'wrong-password')).rejects.toThrow('Invalid passphrase')

      // Should still be locked
      expect(getAppState().status).toBe('locked')
      expect(isLocked()).toBe(true)
    })
  })

  describe('lock()', () => {
    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should transition to locked state', async () => {
      await unlock(testUsername, testPassword, TEST_APP_ID)
      expect(isLocked()).toBe(false)

      lock()
      expect(getAppState().status).toBe('locked')
      expect(isLocked()).toBe(true)
      expect(getCurrentUsername()).toBeNull()
    })

    it('should be idempotent (can lock when already locked)', () => {
      lock()
      expect(getAppState().status).toBe('locked')

      lock()
      expect(getAppState().status).toBe('locked')
    })
  })

  describe('getDataStore()', () => {
    it('should throw error when locked', () => {
      expect(() => getDataStore()).toThrow('Cannot access database while locked')
    })

    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should return DataStore when unlocked', async () => {
      await unlock(testUsername, testPassword, TEST_APP_ID)

      const dataStore = getDataStore()

      expect(dataStore).toBeDefined()
      expect(dataStore.activities).toBeDefined()
      expect(dataStore.saveActivity).toBeDefined()
      expect(dataStore.loadAll).toBeDefined()
    })

    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should return same DataStore instance for same session', async () => {
      await unlock(testUsername, testPassword, TEST_APP_ID)

      const dataStore1 = getDataStore()
      const dataStore2 = getDataStore()

      expect(dataStore1).toBe(dataStore2)
    })
  })

  describe('type safety', () => {
    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should enforce type-safe access to dataStore', async () => {
      // When locked, TypeScript prevents access to dataStore
      // This is a compile-time check, not runtime
      expect(getAppState().status).toBe('locked')

      // Unlock to access dataStore
      await unlock(testUsername, testPassword, TEST_APP_ID)

      const appState = getAppState()
      if (appState.status === 'unlocked') {
        // TypeScript knows dataStore exists here
        expect(appState.dataStore).toBeDefined()
        expect(appState.username).toBe(testUsername)
      }
    })
  })

  describe('reactive derived values', () => {
    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should update isLocked() reactively', async () => {
      expect(isLocked()).toBe(true)

      await unlock(testUsername, testPassword, TEST_APP_ID)
      expect(isLocked()).toBe(false)

      lock()
      expect(isLocked()).toBe(true)
    })

    // NOTE: Requires IndexedDB adapter which is not available in test environment
    it.skip('should update getCurrentUsername() reactively', async () => {
      expect(getCurrentUsername()).toBeNull()

      await unlock(testUsername, testPassword, TEST_APP_ID)
      expect(getCurrentUsername()).toBe(testUsername)

      lock()
      expect(getCurrentUsername()).toBeNull()
    })
  })

  describe('multiple accounts', () => {
    // NOTE: This test requires real Fireproof/IndexedDB persistence
    // Move to E2E tests once those are set up
    it.skip('should support switching between different accounts', async () => {
      const user1 = 'user1'
      const user2 = 'user2'
      const pass1 = 'pass1'
      const pass2 = 'pass2'
      const appId1 = 'test-app-id-user1'
      const appId2 = 'test-app-id-user2'

      // Create first account
      await unlock(user1, pass1, appId1)
      const dataStore1 = getDataStore()
      await dataStore1.saveActivity({
        _id: 'user1-activity-1',
        task: 'User 1 task',
        tags: ['user1'],
        from: Date.now(),
        to: null,
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(dataStore1.activities.length).toBeGreaterThanOrEqual(1)
      lock()

      // Create second account
      await unlock(user2, pass2, appId2)
      const dataStore2 = getDataStore()
      expect(dataStore2.activities.length).toBe(0) // Different account
      await dataStore2.saveActivity({
        _id: 'user2-activity-1',
        task: 'User 2 task',
        tags: ['user2'],
        from: Date.now(),
        to: null,
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
      lock()

      // Verify each account has its own data
      await unlock(user1, pass1, appId1)
      const dataStore1Again = getDataStore()
      expect(dataStore1Again.activities.length).toBeGreaterThanOrEqual(1)
      const user1Activity = dataStore1Again.activities.find((a) => a._id === 'user1-activity-1')
      expect(user1Activity).toBeDefined()
      expect(user1Activity?.task).toBe('User 1 task')
      lock()

      await unlock(user2, pass2, appId2)
      const dataStore2Again = getDataStore()
      expect(dataStore2Again.activities.length).toBeGreaterThanOrEqual(1)
      const user2Activity = dataStore2Again.activities.find((a) => a._id === 'user2-activity-1')
      expect(user2Activity).toBeDefined()
      expect(user2Activity?.task).toBe('User 2 task')

      // Cleanup
      await cleanupDatabase(user1, appId1)
      await cleanupDatabase(user2, appId2)
    })
  })
})
