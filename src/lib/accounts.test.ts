import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAccounts,
  createAccount,
  deleteAccount,
  updateLastUsed,
  accountExists,
  getAccount,
  getAccountCount,
} from './accounts'

describe('Account Management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with no accounts', () => {
    expect(getAccounts()).toHaveLength(0)
    expect(getAccountCount()).toBe(0)
  })

  it('creates new account', () => {
    createAccount('work')
    expect(getAccounts()).toHaveLength(1)
    expect(getAccounts()[0].username).toBe('work')
    expect(getAccounts()[0].createdAt).toBeGreaterThan(0)
    expect(getAccounts()[0].lastUsedAt).toBeGreaterThan(0)
  })

  it('prevents duplicate accounts', () => {
    createAccount('work')
    expect(() => createAccount('work')).toThrow('already exists')
  })

  it('validates username format - rejects invalid', () => {
    expect(() => createAccount('')).toThrow('Invalid username')
    expect(() => createAccount('a b')).toThrow('Invalid username') // Space
    expect(() => createAccount('user@domain')).toThrow('Invalid username') // @
    expect(() => createAccount('user.name')).toThrow('Invalid username') // dot
    expect(() => createAccount('a'.repeat(51))).toThrow('Invalid username') // Too long
  })

  it('validates username format - accepts valid', () => {
    expect(() => createAccount('work')).not.toThrow()
    expect(() => createAccount('my-account')).not.toThrow()
    expect(() => createAccount('user_123')).not.toThrow()
    expect(() => createAccount('Account-2024')).not.toThrow()
    expect(getAccountCount()).toBe(4)
  })

  it('deletes account', async () => {
    createAccount('work')
    expect(getAccounts()).toHaveLength(1)

    await deleteAccount('work')
    expect(getAccounts()).toHaveLength(0)
  })

  it('throws on deleting non-existent account', async () => {
    await expect(deleteAccount('nonexistent')).rejects.toThrow('not found')
  })

  it('updates last used timestamp', async () => {
    createAccount('work')
    const before = getAccount('work')!.lastUsedAt

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10))

    updateLastUsed('work')
    const after = getAccount('work')!.lastUsedAt
    expect(after).toBeGreaterThan(before)
  })

  it('sorts by most recently used', async () => {
    createAccount('old')

    // Wait to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))

    createAccount('new')

    // Wait again
    await new Promise((resolve) => setTimeout(resolve, 10))

    updateLastUsed('old')

    const accounts = getAccounts()
    expect(accounts[0].username).toBe('old') // Most recent first
    expect(accounts[1].username).toBe('new')
  })

  it('accountExists returns correct value', () => {
    expect(accountExists('work')).toBe(false)

    createAccount('work')
    expect(accountExists('work')).toBe(true)
    expect(accountExists('personal')).toBe(false)
  })

  it('getAccount returns account info', () => {
    createAccount('work')

    const account = getAccount('work')
    expect(account).not.toBeNull()
    expect(account!.username).toBe('work')

    const missing = getAccount('nonexistent')
    expect(missing).toBeNull()
  })

  it('persists accounts across reads', () => {
    createAccount('work')
    createAccount('personal')

    // Verify they're saved by reading again
    const accounts = getAccounts()
    expect(accounts).toHaveLength(2)
    expect(accounts.map((a) => a.username)).toContain('work')
    expect(accounts.map((a) => a.username)).toContain('personal')
  })

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    getItemSpy.mockImplementation(() => {
      throw new Error('Storage error')
    })

    // Should return empty array instead of throwing
    const accounts = getAccounts()
    expect(accounts).toEqual([])

    getItemSpy.mockRestore()
  })

  it('handles corrupted localStorage data', () => {
    // Put invalid JSON in localStorage
    localStorage.setItem('tickytock_accounts', 'invalid json{')

    // Should return empty array
    const accounts = getAccounts()
    expect(accounts).toEqual([])
  })

  it('creates multiple accounts independently', () => {
    createAccount('work')
    createAccount('personal')
    createAccount('freelance')

    expect(getAccountCount()).toBe(3)
    expect(accountExists('work')).toBe(true)
    expect(accountExists('personal')).toBe(true)
    expect(accountExists('freelance')).toBe(true)
  })

  it('deletes specific account without affecting others', async () => {
    createAccount('work')
    createAccount('personal')
    createAccount('freelance')

    await deleteAccount('personal')

    expect(getAccountCount()).toBe(2)
    expect(accountExists('work')).toBe(true)
    expect(accountExists('personal')).toBe(false)
    expect(accountExists('freelance')).toBe(true)
  })
})
