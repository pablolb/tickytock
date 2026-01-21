import PouchDBModule from 'pouchdb-browser'
// @ts-expect-error - PouchDB module resolution
const PouchDB = PouchDBModule.default || PouchDBModule

// pouchdb-browser already includes IndexedDB adapter built-in

const ACCOUNTS_KEY = 'tickytock_accounts'

export type AccountInfo = {
  username: string
  createdAt: number // Unix timestamp
  lastUsedAt: number
  appId: string // UUID for sync namespace/room
}

/**
 * Load accounts from localStorage.
 * Returns accounts sorted by most recently used.
 */
export function getAccounts(): AccountInfo[] {
  try {
    const json = localStorage.getItem(ACCOUNTS_KEY)
    if (!json) return []

    const accounts = JSON.parse(json) as AccountInfo[]

    // Migration: Add appId to accounts that don't have one
    let needsSave = false
    for (const account of accounts) {
      if (!account.appId) {
        account.appId = crypto.randomUUID()
        needsSave = true
      }
    }
    if (needsSave) {
      saveAccounts(accounts)
    }

    return accounts.sort((a, b) => b.lastUsedAt - a.lastUsedAt) // Most recent first
  } catch (error) {
    console.error('Failed to load accounts:', error)
    return []
  }
}

/**
 * Save accounts to localStorage.
 */
function saveAccounts(accounts: AccountInfo[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

/**
 * Validate username format.
 * Must be 1-50 chars, alphanumeric + hyphens + underscores.
 */
function isValidUsername(username: string): boolean {
  const regex = /^[a-zA-Z0-9_-]{1,50}$/
  return regex.test(username)
}

/**
 * Create a new account.
 * @throws Error if username is invalid or already exists
 */
export function createAccount(username: string): void {
  // Validate username
  if (!isValidUsername(username)) {
    throw new Error('Invalid username. Use only letters, numbers, hyphens, and underscores.')
  }

  // Check for duplicates
  const accounts = getAccounts()
  if (accounts.some((a) => a.username === username)) {
    throw new Error(`Account "${username}" already exists`)
  }

  // Add to list
  const newAccount: AccountInfo = {
    username,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    appId: crypto.randomUUID(), // Generate unique room/namespace ID
  }

  accounts.push(newAccount)
  saveAccounts(accounts)
}

/**
 * Delete an account and its Fireproof database.
 * @throws Error if account doesn't exist
 */
export async function deleteAccount(username: string): Promise<void> {
  // Get account info before removing (need appId for DB name)
  const accounts = getAccounts()
  const account = accounts.find((a) => a.username === username)

  if (!account) {
    throw new Error(`Account "${username}" not found`)
  }

  // Remove from list
  const filtered = accounts.filter((a) => a.username !== username)
  saveAccounts(filtered)

  // Delete PouchDB database (includes appId to match creation)
  try {
    const dbName = `tickytock-${username}-${account.appId}`
    const db = new PouchDB(dbName)
    await db.destroy()
  } catch (error) {
    console.error(`Failed to delete database for ${username}:`, error)
    // Don't throw - account removed from list, DB deletion is best-effort
  }
}

/**
 * Update the lastUsedAt timestamp for an account.
 */
export function updateLastUsed(username: string): void {
  const accounts = getAccounts()
  const account = accounts.find((a) => a.username === username)

  if (account) {
    account.lastUsedAt = Date.now()
    saveAccounts(accounts)
  }
}

/**
 * Check if an account exists.
 */
export function accountExists(username: string): boolean {
  return getAccounts().some((a) => a.username === username)
}

/**
 * Get account info for a specific username.
 */
export function getAccount(username: string): AccountInfo | null {
  return getAccounts().find((a) => a.username === username) || null
}

/**
 * Get the total number of accounts.
 */
export function getAccountCount(): number {
  return getAccounts().length
}

/**
 * Get the appId (room/namespace UUID) for a username.
 */
export function getAppId(username: string): string | null {
  const account = getAccount(username)
  return account?.appId || null
}
