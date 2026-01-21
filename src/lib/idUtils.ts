/**
 * Document type constants (table/namespace names)
 */
export const DOC_TYPES = {
  ACTIVITY: 'activity',
  SETTINGS: 'settings',
} as const

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES]

/**
 * Generate a new UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Create a prefixed document ID for storage
 * @example toDocId('activity', 'abc-123') => 'activity:abc-123'
 */
export function toDocId(type: DocType, id: string): string {
  return `${type}:${id}`
}

/**
 * Parse a prefixed document ID
 * @example fromDocId('activity:abc-123') => { type: 'activity', id: 'abc-123' }
 */
export function fromDocId(docId: string): { type: DocType; id: string } {
  const [type, id] = docId.split(':')
  return { type: type as DocType, id }
}

/**
 * Extract just the UUID from a prefixed doc ID
 * @example extractId('activity:abc-123') => 'abc-123'
 */
export function extractId(docId: string): string {
  return fromDocId(docId).id
}

/**
 * Check if a document ID matches a specific type
 */
export function isDocType(docId: string, type: DocType): boolean {
  return docId.startsWith(`${type}:`)
}
