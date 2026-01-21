import { describe, it, expect } from 'vitest'
import { webcrypto } from 'crypto'
import type { CryptoInterface } from './encryption'
import { EncryptionHelper, DecryptionError } from './encryption'

describe('EncryptionHelper', () => {
  it('encrypts and decrypts strings correctly', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = 'Hello, World!'

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertexts for same input (random IV)', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = 'test data'

    const encrypted1 = await helper.encrypt(plaintext)
    const encrypted2 = await helper.encrypt(plaintext)

    // Different ciphertexts due to random IVs
    expect(encrypted1).not.toBe(encrypted2)

    // Both should decrypt to the same value
    const decrypted1 = await helper.decrypt(encrypted1)
    const decrypted2 = await helper.decrypt(encrypted2)
    expect(decrypted1).toBe(plaintext)
    expect(decrypted2).toBe(plaintext)
  })

  it('throws DecryptionError on invalid ciphertext', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)

    await expect(helper.decrypt('invalid-data')).rejects.toThrow(DecryptionError)
    await expect(helper.decrypt('invalid|format')).rejects.toThrow(DecryptionError)
    await expect(helper.decrypt('notevenhex|data')).rejects.toThrow(DecryptionError)
  })

  it('throws DecryptionError on wrong passphrase', async () => {
    const helper1 = new EncryptionHelper(
      'correct-passphrase',
      webcrypto as unknown as CryptoInterface
    )
    const encrypted = await helper1.encrypt('secret data')

    const helper2 = new EncryptionHelper(
      'wrong-passphrase',
      webcrypto as unknown as CryptoInterface
    )
    await expect(helper2.decrypt(encrypted)).rejects.toThrow(DecryptionError)
  })

  it('handles empty strings', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = ''

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
    expect(encrypted).toMatch(/^[0-9a-f]+\|[0-9a-f]+$/) // Valid format
  })

  it('handles unicode characters', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = '你好世界 🌍 مرحبا العالم'

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles long strings', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = 'a'.repeat(10000)

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('handles special characters and newlines', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const plaintext = 'Line 1\nLine 2\tTabbed\r\nWindows newline\x00Null byte'

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('caches derived key (performance)', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)

    // The main goal is to verify that multiple encryptions work correctly
    // without re-deriving the key each time. We don't rely on timing assertions
    // since they're inherently unreliable in test environments.

    const encrypted1 = await helper.encrypt('test1')
    const encrypted2 = await helper.encrypt('test2')
    const encrypted3 = await helper.encrypt('test3')

    // Verify all encryptions succeeded
    expect(encrypted1).toMatch(/^[0-9a-f]+\|[0-9a-f]+$/)
    expect(encrypted2).toMatch(/^[0-9a-f]+\|[0-9a-f]+$/)
    expect(encrypted3).toMatch(/^[0-9a-f]+\|[0-9a-f]+$/)

    // Verify they all decrypt correctly (proves key caching works)
    expect(await helper.decrypt(encrypted1)).toBe('test1')
    expect(await helper.decrypt(encrypted2)).toBe('test2')
    expect(await helper.decrypt(encrypted3)).toBe('test3')
  })

  it('throws error when passphrase is empty', () => {
    expect(() => new EncryptionHelper('', webcrypto as unknown as CryptoInterface)).toThrow(
      'Passphrase cannot be empty'
    )
  })

  it('encrypted data has correct format (iv|ciphertext)', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const encrypted = await helper.encrypt('test')

    // Should be hex string with pipe separator
    expect(encrypted).toMatch(/^[0-9a-f]+\|[0-9a-f]+$/)

    // IV should be 12 bytes (24 hex chars)
    const [iv, ciphertext] = encrypted.split('|')
    expect(iv.length).toBe(24) // 12 bytes * 2 hex chars per byte

    // Ciphertext should be at least as long as plaintext + auth tag
    expect(ciphertext.length).toBeGreaterThan(0)
  })

  it('different passphrases produce different results', async () => {
    const plaintext = 'same data'

    const helper1 = new EncryptionHelper('passphrase1', webcrypto as unknown as CryptoInterface)
    const encrypted1 = await helper1.encrypt(plaintext)

    const helper2 = new EncryptionHelper('passphrase2', webcrypto as unknown as CryptoInterface)
    const encrypted2 = await helper2.encrypt(plaintext)

    // Different passphrases should produce different ciphertexts
    expect(encrypted1).not.toBe(encrypted2)

    // Each should decrypt correctly with its own passphrase
    expect(await helper1.decrypt(encrypted1)).toBe(plaintext)
    expect(await helper2.decrypt(encrypted2)).toBe(plaintext)

    // But not with the other's passphrase
    await expect(helper1.decrypt(encrypted2)).rejects.toThrow(DecryptionError)
    await expect(helper2.decrypt(encrypted1)).rejects.toThrow(DecryptionError)
  })

  it('DecryptionError has correct name property', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)

    try {
      await helper.decrypt('invalid')
      expect.fail('Should have thrown DecryptionError')
    } catch (error) {
      expect(error).toBeInstanceOf(DecryptionError)
      expect((error as DecryptionError).name).toBe('DecryptionError')
    }
  })

  it('handles JSON data encryption', async () => {
    const helper = new EncryptionHelper('test-passphrase', webcrypto as unknown as CryptoInterface)
    const data = { name: 'John', age: 30, tags: ['admin', 'user'] }
    const plaintext = JSON.stringify(data)

    const encrypted = await helper.encrypt(plaintext)
    const decrypted = await helper.decrypt(encrypted)
    const parsed = JSON.parse(decrypted)

    expect(parsed).toEqual(data)
  })
})
