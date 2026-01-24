import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAppState,
  isLocked,
  getCurrentUsername,
  unlock,
  lock,
  getDataStore,
} from './auth.svelte'

describe('Auth State Machine', () => {
  const testUsername = 'testuser'
  const testPassword = 'test-password-123'

  beforeEach(() => {
    // Ensure we start in locked state
    lock()
  })

  describe('initial state', () => {
    it('should start in locked state', () => {
      expect(getAppState().status).toBe('locked')
      expect(isLocked()).toBe(true)
      expect(getCurrentUsername()).toBeNull()
    })
  })

  describe('unlock()', () => {
    it('should throw error with empty username', async () => {
      await expect(unlock('', testPassword)).rejects.toThrow('Username and password are required')
    })

    it('should throw error with empty password', async () => {
      await expect(unlock(testUsername, '')).rejects.toThrow('Username and password are required')
    })
  })

  describe('lock()', () => {
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
  })
})
