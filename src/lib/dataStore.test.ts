import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import PouchDB from 'pouchdb-browser'
import memoryAdapter from 'pouchdb-adapter-memory'
import { DataStore } from './dataStore.svelte'
import type { Activity, ActivityDoc } from './types'

// Register memory adapter for testing
PouchDB.plugin(memoryAdapter)

// Helper to wait for reactive updates
const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('DataStore', () => {
  let db: PouchDB.Database
  let dataStore: DataStore
  let dbName: string

  beforeEach(async () => {
    // Create unique DB name for each test
    dbName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    db = new PouchDB(dbName, { adapter: 'memory' })
    // New constructor signature: (db, password, appId)
    dataStore = new DataStore(db, 'test-passphrase', 'test-app-id')
  })

  afterEach(async () => {
    // Cleanup database
    if (db) {
      await db.destroy()
    }
  })

  describe('loadAll', () => {
    it('should load empty database', async () => {
      await dataStore.loadAll()

      expect(dataStore.activities).toHaveLength(0)
      expect(dataStore.isLoading).toBe(false)
    })
  })

  describe('saveActivity', () => {
    it('should save and update in-memory state', async () => {
      await dataStore.loadAll()

      const activity: Activity = {
        task: 'New activity',
        tags: ['work'],
        from: Date.now(),
        to: null,
      }

      await dataStore.saveActivity(activity)
      await waitForUpdate()

      expect(dataStore.activities).toHaveLength(1)
      expect(dataStore.activities[0].task).toBe('New activity')
    })

    it('should update existing activity', async () => {
      await dataStore.loadAll()

      const activity: Activity = {
        _id: 'test-activity-1',
        task: 'Original task',
        tags: ['test'],
        from: Date.now(),
        to: null,
      }

      await dataStore.saveActivity(activity)
      await waitForUpdate()
      expect(dataStore.activities[0].task).toBe('Original task')

      // Get the saved activity with its _rev
      const saved = dataStore.getActivityById('test-activity-1')!
      expect(saved._rev).toBeDefined()

      // Update the activity with the revision
      const updated: ActivityDoc = {
        ...saved,
        task: 'Updated task',
        to: Date.now(),
      }

      await dataStore.saveActivity(updated)
      await waitForUpdate()

      expect(dataStore.activities).toHaveLength(1)
      expect(dataStore.activities[0].task).toBe('Updated task')
      expect(dataStore.activities[0].to).not.toBeNull()
    })

    it('should generate ID if not provided', async () => {
      await dataStore.loadAll()

      const activity: Activity = {
        task: 'No ID activity',
        tags: [],
        from: Date.now(),
        to: null,
      }

      await dataStore.saveActivity(activity)
      await waitForUpdate()

      expect(dataStore.activities).toHaveLength(1)
      expect(dataStore.activities[0]._id).toBeDefined()
    })
  })

  describe('query methods', () => {
    beforeEach(async () => {
      await dataStore.loadAll()

      // Add some test activities with explicit IDs to avoid collisions
      await dataStore.saveActivity({
        _id: 'activity-work-1',
        task: 'Work task',
        tags: ['work'],
        from: Date.now() - 3000,
        to: Date.now() - 2000,
      })

      await dataStore.saveActivity({
        _id: 'activity-personal-1',
        task: 'Personal task',
        tags: ['personal'],
        from: Date.now() - 1000,
        to: null,
      })

      await dataStore.saveActivity({
        _id: 'activity-work-2',
        task: 'Work project',
        tags: ['work', 'project'],
        from: Date.now(),
        to: null,
      })

      // Wait for reactive state to update after all saves
      await waitForUpdate()
    })

    it('should query activities synchronously', () => {
      const workActivities = dataStore.getActivities({ tags: ['work'] })
      expect(workActivities).toHaveLength(2)
    })

    it('should get current activity', () => {
      const current = dataStore.getCurrentActivity()
      expect(current).toBeDefined()
      expect(current!.to).toBeNull()
      expect(current!.task).toBe('Work project')
    })

    it('should filter by tags', () => {
      const personal = dataStore.getActivities({ tags: ['personal'] })
      expect(personal).toHaveLength(1)
      expect(personal[0].task).toBe('Personal task')
    })

    it('should filter by running status', () => {
      const running = dataStore.getActivities({ running: true })
      expect(running).toHaveLength(2)
      expect(running.every((a) => a.to === null)).toBe(true)
    })

    it('should filter by date range', () => {
      const now = Date.now()
      const recent = dataStore.getActivities({ dateFrom: now - 2000 })
      expect(recent).toHaveLength(2)
    })

    it('should get activity by ID', () => {
      const allActivities = dataStore.getActivities()
      const firstId = allActivities[0]._id

      const found = dataStore.getActivityById(firstId)
      expect(found).toBeDefined()
      expect(found!._id).toBe(firstId)
    })

    it('should return undefined for non-existent ID', () => {
      const found = dataStore.getActivityById('non-existent')
      expect(found).toBeUndefined()
    })
  })

  describe('updateActivity', () => {
    it('should update existing activity', async () => {
      await dataStore.loadAll()

      await dataStore.saveActivity({
        _id: 'test-update-1',
        task: 'Original',
        tags: ['test'],
        from: Date.now(),
        to: null,
      })
      await waitForUpdate()

      await dataStore.updateActivity('test-update-1', {
        task: 'Updated',
        to: Date.now(),
      })
      await waitForUpdate()

      expect(dataStore.activities[0].task).toBe('Updated')
      expect(dataStore.activities[0].to).not.toBeNull()
    })

    it('should throw error for non-existent activity', async () => {
      await dataStore.loadAll()

      await expect(dataStore.updateActivity('non-existent', { task: 'Test' })).rejects.toThrow(
        'Activity non-existent not found'
      )
    })
  })

  describe('deleteActivity', () => {
    it('should delete activity', async () => {
      await dataStore.loadAll()

      await dataStore.saveActivity({
        _id: 'test-delete-1',
        task: 'To delete',
        tags: [],
        from: Date.now(),
        to: null,
      })
      await waitForUpdate()

      expect(dataStore.activities).toHaveLength(1)

      await dataStore.deleteActivity('test-delete-1')
      await waitForUpdate()

      expect(dataStore.activities).toHaveLength(0)
    })

    it('should throw error for non-existent activity', async () => {
      await dataStore.loadAll()

      await expect(dataStore.deleteActivity('non-existent')).rejects.toThrow(
        'Activity non-existent not found'
      )
    })
  })
})
