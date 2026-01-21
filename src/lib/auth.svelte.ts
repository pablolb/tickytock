import PouchDBModule from 'pouchdb-browser'
// @ts-expect-error - PouchDB module resolution
const PouchDB = PouchDBModule.default || PouchDBModule
import { DataStore, InvalidPassphraseError } from './dataStore.svelte'
import { updateLastUsed, createAccount, getAppId } from './accounts'
import { getActiveSyncConfig } from './settings'
import type { SyncInfo } from '@mrbelloc/encrypted-pouch'

// pouchdb-browser already includes IndexedDB and HTTP adapters built-in

/**
 * Connect to sync based on current settings
 * Helper function to avoid code duplication
 */
async function connectToSync(dataStore: DataStore, onSyncConnected?: () => void): Promise<void> {
  const syncConfig = getActiveSyncConfig(dataStore.settings)

  if (!syncConfig) {
    return
  }

  try {
    // Use DataStore's connectRemote method
    await dataStore.connectRemote(syncConfig)

    // Notify that sync is connected
    if (onSyncConnected) {
      onSyncConnected()
    }
  } catch (error) {
    console.error('[Auth] !!! SYNC CONNECTION ERROR:', error)
    console.warn('[Auth] Sync failed, continuing in offline mode:', error)
    // Don't throw - offline-first!
  }
}

/**
 * Locked state - no database access allowed
 */
type Locked = {
  readonly status: 'locked'
}

/**
 * Unlocked state - database is available
 */
type Unlocked = {
  readonly status: 'unlocked'
  readonly username: string
  readonly dataStore: DataStore
}

/**
 * Auth state machine - app can only be in one of these states
 */
type AuthState = Locked | Unlocked

// Export types for components
export type { AuthState, Locked, Unlocked }

// Global reactive state (Svelte 5 runes)
// Keep private to avoid export reassignment issues
let _appState = $state<AuthState>({ status: 'locked' })

// Export getter functions instead of direct state
export function getAppState(): AuthState {
  return _appState
}

export function isLocked(): boolean {
  return _appState.status === 'locked'
}

export function getCurrentUsername(): string | null {
  return _appState.status === 'unlocked' ? _appState.username : null
}

// Export connectToSync so it can be called from App.svelte's $effect
export { connectToSync }

/**
 * Unlock the app with username and password.
 * Creates/opens the PouchDB database for the user,
 * initializes DataStore with encryption, and loads all data.
 *
 * @param username - The username
 * @param password - The password/passphrase
 * @param testAppId - Optional appId for testing/e2e (bypasses account lookup)
 * @param onSync - Optional callback for sync events
 * @param onSyncConnected - Optional callback when sync connection is established
 * @throws {Error} If username or password is empty
 * @throws {Error} If passphrase is incorrect (wrapped InvalidPassphraseError)
 */
export async function unlock(
  username: string,
  password: string,
  testAppId?: string,
  onSync?: (info: SyncInfo) => void,
  onSyncConnected?: () => void
): Promise<void> {
  if (!username || !password) {
    throw new Error('Username and password are required')
  }

  try {
    // Get appId - use testAppId if provided (for testing), otherwise lookup from accounts
    const appId = testAppId || getAppId(username)
    if (!appId) {
      throw new Error('Account not found')
    }

    // Create/open PouchDB database for this user (includes appId to isolate per-device)
    const dbName = `tickytock-${username}-${appId}`
    const userDb = new PouchDB(dbName)

    // Initialize DataStore (handles encryption internally)
    const dataStore = new DataStore(userDb, password, appId, onSync)

    // Load all encrypted data into memory (will verify passphrase)
    await dataStore.loadAll()

    // Enable sync if configured (non-blocking - don't await)
    connectToSync(dataStore, onSyncConnected).catch((error) => {
      console.error('[Auth] Sync connection failed (non-blocking):', error)
    })

    // Transition to unlocked state
    _appState = {
      status: 'unlocked',
      username,
      dataStore,
    }

    // Track account usage
    updateLastUsed(username)
  } catch (error) {
    console.error('[Auth] ✗ Failed to unlock:', error)
    if (error instanceof InvalidPassphraseError) {
      throw new Error('Invalid passphrase')
    }
    throw error
  }
}

/**
 * Lock the app and clear all sensitive data from memory.
 */
export function lock(): void {
  // Disconnect sync if unlocked
  if (_appState.status === 'unlocked') {
    _appState.dataStore.disconnectRemote()
  }

  _appState = { status: 'locked' }
}

/**
 * Create a new account and unlock it.
 * Convenience method that combines account creation and unlock.
 *
 * @throws {Error} If username is invalid or already exists
 * @throws {Error} If unlock fails
 */
export async function createAccountAndUnlock(username: string, password: string): Promise<void> {
  createAccount(username)
  await unlock(username, password)
}

/**
 * Get the DataStore instance.
 * Throws an error if app is locked.
 *
 * @throws {Error} If app is locked
 * @returns {DataStore} The active DataStore instance
 */
export function getDataStore(): DataStore {
  if (_appState.status !== 'unlocked') {
    throw new Error('Cannot access database while locked')
  }

  // TypeScript knows appState.dataStore exists here!
  return _appState.dataStore
}

/**
 * Get current settings (reactive)
 */
export function getSettings() {
  if (_appState.status !== 'unlocked') {
    return null
  }
  return _appState.dataStore.settings
}

/**
 * Update settings and reconnect sync if needed
 */
export async function updateSettings(
  settings: Partial<import('./settings').Settings>
): Promise<void> {
  const dataStore = getDataStore()
  const oldSettings = dataStore.settings
  const newSettings = { ...oldSettings, ...settings }

  await dataStore.saveSettings(newSettings)

  // If sync settings changed, reconnect
  const oldSyncConfig = getActiveSyncConfig(oldSettings)
  const newSyncConfig = getActiveSyncConfig(newSettings)

  const syncChanged = JSON.stringify(oldSyncConfig) !== JSON.stringify(newSyncConfig)

  if (syncChanged) {
    // Disconnect old sync
    dataStore.disconnectRemote()

    // Connect with new settings
    await connectToSync(dataStore)
  }
}

/**
 * Auto-lock on inactivity (optional feature)
 */
let activityTimer: ReturnType<typeof setTimeout> | null = null
const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes

/**
 * Reset the inactivity timer.
 * Call this on every user interaction to prevent auto-lock.
 */
export function resetActivityTimer(): void {
  if (activityTimer) clearTimeout(activityTimer)

  activityTimer = setTimeout(() => {
    if (_appState.status === 'unlocked') {
      lock()
    }
  }, INACTIVITY_TIMEOUT)
}

/**
 * Record user activity to prevent auto-lock.
 * Call this on any user interaction (clicks, typing, etc.)
 */
export function recordActivity(): void {
  if (_appState.status === 'unlocked') {
    resetActivityTimer()
  }
}
