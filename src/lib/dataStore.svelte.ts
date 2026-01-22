import type PouchDB from 'pouchdb-browser'
import {
  EncryptedPouch,
  type Doc,
  type RemoteOptions,
  type SyncInfo,
} from '@mrbelloc/encrypted-pouch'
import type { Activity, ActivityDoc } from './types'
import { DEFAULT_SETTINGS, getSettingsDocId, type Settings } from './settings'
import { applyTheme } from './themeStore.svelte'

/**
 * Document reference (minimal info for deleted docs)
 */
interface DocRef {
  _id: string
}

/**
 * Custom error thrown when passphrase is incorrect
 */
export class InvalidPassphraseError extends Error {
  name = 'InvalidPassphraseError' as const

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, InvalidPassphraseError.prototype)
  }
}

/**
 * Filter options for querying activities
 */
export interface ActivityFilter {
  dateFrom?: number
  dateTo?: number
  tags?: string[]
  running?: boolean
}

/**
 * DataStore manages activities in-memory with encryption/decryption.
 *
 * Pattern (using EncryptedPouch):
 * 1. Create EncryptedPouch with event listeners
 * 2. Load all encrypted docs from PouchDB on unlock
 * 3. Events update Svelte $state (in-memory plaintext)
 * 4. All queries are synchronous (read from memory)
 * 5. Mutations go through EncryptedPouch (which handles encryption + PouchDB)
 * 6. EncryptedPouch detects changes and fires events to update in-memory state
 */
export class DataStore {
  // Public reactive state (Svelte 5)
  activities = $state<ActivityDoc[]>([])
  settings = $state<Settings>(DEFAULT_SETTINGS)
  isLoading = $state(false)

  private store: EncryptedPouch
  private appId: string
  private onSyncCallback?: (info: SyncInfo) => void

  constructor(
    db: PouchDB.Database,
    password: string,
    appId: string,
    onSync?: (info: SyncInfo) => void
  ) {
    this.appId = appId
    this.onSyncCallback = onSync
    // Create EncryptedPouch with listeners that update our in-memory state
    this.store = new EncryptedPouch(db, password, {
      onChange: (changes) => this.handleChange(changes),
      onDelete: (deletions) => this.handleDelete(deletions),
      onSync: onSync ? (info) => this.handleSync(info) : undefined,
    })
  }

  /**
   * Load all documents from PouchDB and decrypt them into memory.
   * Verifies passphrase by attempting to decrypt documents.
   *
   * @throws {InvalidPassphraseError} If passphrase is incorrect
   */
  async loadAll(): Promise<void> {
    this.isLoading = true

    try {
      // EncryptedPouch.loadAll() will:
      // 1. Read all encrypted docs from PouchDB
      // 2. Decrypt them (verifying passphrase)
      // 3. Fire onChange events for all documents
      // Our event handlers will populate activities and settings
      await this.store.loadAll()
    } catch (error) {
      console.error('[DataStore] ✗ Error loading data:', error)
      throw new InvalidPassphraseError('Incorrect passphrase')
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Connect to remote CouchDB for sync
   */
  async connectRemote(options: RemoteOptions): Promise<void> {
    await this.store.connectRemote(options)
  }

  /**
   * Disconnect from remote sync
   */
  disconnectRemote(): void {
    this.store.disconnectRemote()
  }

  /**
   * Manually trigger a sync now
   */
  async syncNow(): Promise<void> {
    await this.store.syncNow()
  }

  /**
   * Delete all local data only (disconnects sync first)
   */
  async deleteAllLocal(): Promise<void> {
    await this.store.deleteAllLocal()
    // Clear in-memory state
    this.activities = []
    this.settings = DEFAULT_SETTINGS
  }

  /**
   * Delete all local AND remote data (requires sync to be connected)
   */
  async deleteAllAndSync(): Promise<void> {
    await this.store.deleteAllAndSync()
    // Clear in-memory state
    this.activities = []
    this.settings = DEFAULT_SETTINGS
  }

  /**
   * Get activity by ID (synchronous - reads from memory)
   */
  getActivityById(id: string): ActivityDoc | undefined {
    return this.activities.find((a) => a._id === id)
  }

  /**
   * Get activities with optional filtering (synchronous - reads from memory)
   */
  getActivities(filter?: ActivityFilter): ActivityDoc[] {
    let filtered = this.activities

    if (filter?.dateFrom) {
      filtered = filtered.filter((a) => a.from >= filter.dateFrom!)
    }

    if (filter?.dateTo) {
      filtered = filtered.filter((a) => a.from <= filter.dateTo!)
    }

    if (filter?.tags && filter.tags.length > 0) {
      filtered = filtered.filter((a) => filter.tags!.some((tag) => a.tags.includes(tag)))
    }

    if (filter?.running === true) {
      filtered = filtered.filter((a) => a.to === null)
    }

    return filtered
  }

  /**
   * Get currently running activity (synchronous - reads from memory)
   */
  getCurrentActivity(): ActivityDoc | undefined {
    return this.activities.find((a) => a.to === null)
  }

  /**
   * Save a new or updated activity
   * Fire-and-forget: writes to DB, events will update $state reactively
   */
  async saveActivity(activity: Activity): Promise<void> {
    const isUpdate = '_id' in activity && activity._id !== undefined

    const activityData: Activity = {
      task: activity.task,
      tags: activity.tags,
      from: activity.from,
      to: activity.to,
      timezone: activity.timezone,
    }

    // Preserve _rev to avoid conflicts
    if ('_rev' in activity && activity._rev) {
      activityData._rev = activity._rev
    }

    if (isUpdate) {
      // Update existing document
      const doc: ActivityDoc = activity as ActivityDoc

      await this.store.put('activity', {
        _id: doc._id,
        ...activityData,
      })

      // The onChange event will update our in-memory state
    } else {
      // Create new document
      // EncryptedPouch will generate ID if not provided
      await this.store.put('activity', activityData)

      // The onChange event will update our in-memory state
    }
  }

  /**
   * Update an existing activity
   * Fire-and-forget: writes to DB, events will update $state reactively
   */
  async updateActivity(id: string, updates: Partial<Activity>): Promise<void> {
    const existing = this.getActivityById(id)
    if (!existing) {
      throw new Error(`Activity ${id} not found`)
    }

    const updated = { ...existing, ...updates }
    await this.saveActivity(updated)
  }

  /**
   * Delete an activity (async - updates memory + database)
   */
  async deleteActivity(id: string): Promise<void> {
    const existing = this.getActivityById(id)
    if (!existing) {
      throw new Error(`Activity ${id} not found`)
    }

    await this.store.delete('activity', id)

    // The docsDeleted event will update our in-memory state
  }

  /**
   * Save settings (create or update)
   */
  async saveSettings(settings: Settings): Promise<void> {
    interface SettingsDoc extends Settings {
      _id: string
    }

    const settingsDoc: SettingsDoc = {
      _id: getSettingsDocId(this.appId),
      ...settings,
    }

    // Preserve _rev from current settings if it exists
    if (this.settings._rev) {
      settingsDoc._rev = this.settings._rev
    }

    await this.store.put('settings', settingsDoc)
  }

  /**
   * Handle new or changed documents from EncryptedPouch
   * In v0.4.0, onChange is called for both new and updated docs
   */
  private handleChange(changes: Array<{ table: string; docs: Doc[] }>): void {
    for (const change of changes) {
      for (const doc of change.docs) {
        if (change.table === 'activity') {
          // Check if activity already exists (update vs add)
          const existingIndex = this.activities.findIndex((a) => a._id === doc._id)
          const activity: ActivityDoc = {
            _id: doc._id,
            _rev: doc._rev,
            task: doc.task,
            tags: doc.tags,
            from: doc.from,
            to: doc.to,
            timezone: doc.timezone,
          }

          if (existingIndex >= 0) {
            // Update existing
            this.activities[existingIndex] = activity
          } else {
            // Add new
            this.activities.push(activity)
          }
        } else if (change.table === 'settings') {
          // Only process OUR settings document (not other devices)
          const expectedDocId = getSettingsDocId(this.appId)
          if (doc._id !== expectedDocId) {
            continue
          }

          this.settings = {
            syncMode: doc.syncMode ?? DEFAULT_SETTINGS.syncMode,
            autoStopRunning: doc.autoStopRunning ?? DEFAULT_SETTINGS.autoStopRunning,
            couchdb: doc.couchdb ?? undefined,
            theme: doc.theme ?? DEFAULT_SETTINGS.theme,
            _rev: doc._rev, // Preserve _rev for next update
          }

          // Apply theme to DOM whenever settings change
          applyTheme(this.settings.theme)
        }
      }
    }

    // Sort activities by timestamp (most recent first) after all changes
    this.activities.sort((a, b) => b.from - a.from)
  }

  /**
   * Handle deleted documents from EncryptedPouch
   */
  private handleDelete(deletions: Array<{ table: string; docs: DocRef[] }>): void {
    for (const deletion of deletions) {
      for (const docRef of deletion.docs) {
        if (deletion.table === 'activity') {
          this.activities = this.activities.filter((a) => a._id !== docRef._id)
        }
      }
    }
  }

  /**
   * Handle sync events from EncryptedPouch
   */
  private handleSync(info: SyncInfo): void {
    if (this.onSyncCallback) {
      this.onSyncCallback(info)
    }
  }
}
