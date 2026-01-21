/**
 * Sync modes
 */
export type SyncMode = 'disabled' | 'couchdb'

/**
 * CouchDB sync configuration
 */
export interface CouchDBSyncConfig {
  url: string
  live?: boolean
  retry?: boolean
}

/**
 * Theme settings
 */
export type ColorMode = 'light' | 'dark' | 'auto'
export type ColorScheme =
  | 'blue'
  | 'azure'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'teal'
  | 'cyan'
export type FontFamily = 'sans-serif' | 'serif' | 'monospace'
export type ThemeBase = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
export type CornerRadius = '0' | '0.5' | '1' | '1.5' | '2'

export interface ThemeSettings {
  colorMode: ColorMode
  colorScheme: ColorScheme
  fontFamily: FontFamily
  themeBase: ThemeBase
  cornerRadius: CornerRadius
}

/**
 * Application settings stored in encrypted database
 */
export interface Settings {
  _rev?: string
  autoStopRunning: boolean
  syncMode: SyncMode
  couchdb?: CouchDBSyncConfig // Only used when syncMode === 'couchdb'
  theme: ThemeSettings
}

/**
 * Default theme settings
 */
export const DEFAULT_THEME: ThemeSettings = {
  colorMode: 'auto',
  colorScheme: 'blue',
  fontFamily: 'sans-serif',
  themeBase: 'gray',
  cornerRadius: '1',
}

/**
 * Default settings for new accounts
 */
export const DEFAULT_SETTINGS: Settings = {
  autoStopRunning: true,
  syncMode: 'disabled', // Disable sync by default
  theme: DEFAULT_THEME,
}

/**
 * Get settings document ID for a specific device
 * Each device has its own settings to avoid conflicts during sync
 */
export function getSettingsDocId(appId: string): string {
  return `settings-${appId}`
}

/**
 * Get the active sync configuration based on current settings
 * Returns null if sync is disabled
 */
export function getActiveSyncConfig(settings: Settings): CouchDBSyncConfig | null {
  if (settings.syncMode === 'disabled') {
    return null
  }

  if (settings.syncMode === 'couchdb' && settings.couchdb) {
    return settings.couchdb
  }

  return null
}
