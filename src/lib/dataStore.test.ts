import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import PouchDB from 'pouchdb'
import memoryAdapter from 'pouchdb-adapter-memory'
import { DataStore } from './dataStore.svelte'
import type { Activity } from './types'

// Register memory adapter for testing
PouchDB.plugin(memoryAdapter)

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

      const saved = await dataStore.saveActivity(activity)

      expect(dataStore.activities).toHaveLength(1)
      expect(dataStore.activities[0]._id).toBe(saved._id)
      expect(dataStore.activities[0].task).toBe('New activity')
    })

    it('should update existing activity', async () => {
      await dataStore.loadAll()

      const activity: Activity = {
        task: 'Original task',
        tags: ['test'],
        from: Date.now(),
        to: null,
      }

      const saved = await dataStore.saveActivity(activity)
      expect(dataStore.activities[0].task).toBe('Original task')

      // Update the activity
      const updated: Activity = {
        _id: saved._id,
        task: 'Updated task',
        tags: ['test'],
        from: activity.from,
        to: Date.now(),
      }

      await dataStore.saveActivity(updated)

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

      const saved = await dataStore.saveActivity(activity)

      expect(saved._id).toBeDefined()
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

      const saved = await dataStore.saveActivity({
        task: 'Original',
        tags: ['test'],
        from: Date.now(),
        to: null,
      })

      const updated = await dataStore.updateActivity(saved._id, {
        task: 'Updated',
        to: Date.now(),
      })

      expect(updated.task).toBe('Updated')
      expect(updated.to).not.toBeNull()
      expect(dataStore.activities[0].task).toBe('Updated')
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

      const saved = await dataStore.saveActivity({
        task: 'To delete',
        tags: [],
        from: Date.now(),
        to: null,
      })

      expect(dataStore.activities).toHaveLength(1)

      await dataStore.deleteActivity(saved._id)

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
