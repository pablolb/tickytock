/**
 * Interface defining the subset of the Web Crypto API that we use.
 * This allows for dependency injection and easier testing.
 */
interface CryptoInterface {
  subtle: {
    digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>
    importKey(
      format: string,
      keyData: BufferSource,
      algorithm: string | object,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<CryptoKey>
    encrypt(algorithm: string | object, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>
    decrypt(algorithm: string | object, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>
  }
  getRandomValues<T extends ArrayBufferView | null>(array: T): T
}

/**
 * Custom error thrown when decryption fails.
 * This typically indicates an incorrect passphrase or corrupted data.
 */
class DecryptionError extends Error {
  name = 'DecryptionError' as const

  constructor(message: string) {
    super(message)
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DecryptionError.prototype)
  }
}

/**
 * Web Crypto API wrapper for AES-GCM encryption/decryption.
 *
 * Uses AES-256-GCM with:
 * - SHA-256 hashed passphrase as key derivation
 * - Random 12-byte IV for each encryption (ensures unique ciphertexts)
 * - Hex encoding for storage compatibility
 *
 * @example
 * ```typescript
 * const helper = new EncryptionHelper('my-secret-passphrase');
 * const encrypted = await helper.encrypt('sensitive data');
 * const decrypted = await helper.decrypt(encrypted); // 'sensitive data'
 * ```
 */
class EncryptionHelper {
  private keyPromise: Promise<CryptoKey> | null = null
  private readonly passphrase: string
  private readonly crypto: CryptoInterface

  /**
   * Creates a new encryption helper instance.
   *
   * @param passphrase - The passphrase used for encryption/decryption.
   *                     Should be a strong, unique password.
   * @param crypto - Optional crypto implementation. If not provided, uses the global
   *                 crypto object. This parameter is primarily for testing purposes
   *                 or Node.js environments.
   */
  constructor(passphrase: string, crypto?: CryptoInterface) {
    if (!passphrase || passphrase.length === 0) {
      throw new Error('Passphrase cannot be empty')
    }

    this.passphrase = passphrase
    // Use provided crypto or fall back to global (browser or Node.js)
    this.crypto = (crypto ||
      (typeof window !== 'undefined' ? window.crypto : global.crypto)) as CryptoInterface

    if (!this.crypto) {
      throw new Error('Crypto API is not available in this environment')
    }
  }

  /**
   * Derives and caches the AES-GCM key from the passphrase.
   * The key is derived once and reused for performance.
   *
   * @returns Promise resolving to the CryptoKey
   */
  private async getKey(): Promise<CryptoKey> {
    if (this.keyPromise) {
      return this.keyPromise
    }

    const enc = new TextEncoder()
    const pwUtf8 = enc.encode(this.passphrase)
    const pwHash = await this.crypto.subtle.digest('SHA-256', pwUtf8)

    this.keyPromise = this.crypto.subtle.importKey('raw', pwHash, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ])

    return this.keyPromise
  }

  /**
   * Converts a hex string to a Uint8Array.
   *
   * @param hexString - Hex-encoded string (e.g., "48656c6c6f")
   * @returns Decoded byte array
   */
  private static fromHexString(hexString: string): Uint8Array {
    const matches = hexString.match(/.{1,2}/g)
    if (!matches) {
      throw new Error('Invalid hex string format')
    }
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
  }

  /**
   * Converts a Uint8Array to a hex string.
   *
   * @param bytes - Byte array to encode
   * @returns Hex-encoded string with proper zero-padding
   */
  private static toHexString(bytes: Uint8Array): string {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
  }

  /**
   * Encrypts a string using AES-256-GCM.
   * Each encryption uses a random IV, so the same input produces different outputs.
   *
   * @param data - The plaintext string to encrypt
   * @returns Promise resolving to encrypted data in format: `${iv_hex}|${ciphertext_hex}`
   *
   * @example
   * ```typescript
   * const encrypted = await helper.encrypt('secret');
   * // Returns something like: "a1b2c3d4e5f6g7h8i9j0|9f8e7d6c5b4a3..."
   * ```
   */
  async encrypt(data: string): Promise<string> {
    const enc = new TextEncoder()
    const key = await this.getKey()
    const encoded = enc.encode(data)

    // Generate random 12-byte IV (initialization vector)
    const iv = this.crypto.getRandomValues(new Uint8Array(12))

    const ciphertext = await this.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoded
    )

    // Return IV and ciphertext as hex, separated by pipe
    return `${EncryptionHelper.toHexString(iv)}|${EncryptionHelper.toHexString(new Uint8Array(ciphertext))}`
  }

  /**
   * Decrypts a string that was encrypted with the encrypt() method.
   *
   * @param data - The encrypted data in format: `${iv_hex}|${ciphertext_hex}`
   * @returns Promise resolving to the decrypted plaintext string
   * @throws {DecryptionError} If decryption fails (wrong passphrase, corrupted data, or invalid format)
   *
   * @example
   * ```typescript
   * try {
   *   const decrypted = await helper.decrypt(encrypted);
   * } catch (error) {
   *   if (error instanceof DecryptionError) {
   *     console.error('Wrong passphrase or corrupted data');
   *   }
   * }
   * ```
   */
  async decrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey()

      // Split IV and ciphertext
      const parts = data.split('|')
      if (parts.length !== 2) {
        throw new DecryptionError('Invalid encrypted data format: expected "iv|ciphertext"')
      }

      const [iv, ciphertext] = parts.map((s) => EncryptionHelper.fromHexString(s))

      const decrypted = await this.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertext.buffer as ArrayBuffer
      )

      return new TextDecoder().decode(decrypted)
    } catch (e) {
      // Wrap crypto errors in our custom DecryptionError for better error handling
      if (e instanceof DecryptionError) {
        throw e
      }

      const errorMessage = e instanceof Error ? e.message : String(e)
      throw new DecryptionError(
        `Failed to decrypt data. This usually means the passphrase is incorrect or the data is corrupted. Details: ${errorMessage}`
      )
    }
  }
}

export { EncryptionHelper, DecryptionError }
export type { CryptoInterface }
