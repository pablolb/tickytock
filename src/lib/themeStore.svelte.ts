/**
 * Theme utilities - NO separate state, just functions
 *
 * The source of truth is dataStore.settings.theme
 * Components read from there directly and react to changes
 */

import { DEFAULT_THEME } from './settings'
import type { ThemeSettings } from './settings'

/**
 * Apply theme to DOM
 * Called whenever settings.theme changes
 */
export function applyTheme(theme: ThemeSettings = DEFAULT_THEME) {
  if (typeof document === 'undefined') return

  const html = document.documentElement

  // Apply color mode (light/dark)
  const effectiveTheme =
    theme.colorMode === 'auto'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme.colorMode
  html.setAttribute('data-bs-theme', effectiveTheme)

  // Apply color scheme (primary color)
  html.style.setProperty('--tblr-primary', `var(--tblr-${theme.colorScheme})`)

  // Apply font family
  const fontFamilyMap = {
    'sans-serif': 'var(--tblr-font-sans-serif)',
    serif: 'Georgia, serif',
    monospace: 'var(--tblr-font-monospace)',
  }
  html.style.setProperty('--tblr-body-font-family', fontFamilyMap[theme.fontFamily])

  // Apply theme base
  html.setAttribute('data-bs-theme-base', theme.themeBase)

  // Apply corner radius
  const radiusValue = theme.cornerRadius === '0' ? '0px' : `calc(${theme.cornerRadius} * 6px)`
  html.style.setProperty('--tblr-border-radius', radiusValue)
  html.style.setProperty('--tblr-border-radius-sm', `calc(${radiusValue} * 0.667)`)
  html.style.setProperty('--tblr-border-radius-lg', `calc(${radiusValue} * 1.333)`)
}

/**
 * Apply system theme (for locked state)
 */
export function applySystemTheme() {
  if (typeof document === 'undefined') return

  const html = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  html.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light')
}

/**
 * Update theme and save to database
 */
export async function updateTheme(updates: Partial<ThemeSettings>) {
  const { getDataStore } = await import('./auth.svelte')
  const dataStore = getDataStore()

  const currentSettings = dataStore.settings
  const newTheme = { ...currentSettings.theme, ...updates }

  await dataStore.saveSettings({
    ...currentSettings,
    theme: newTheme,
  })
}

/**
 * Reset theme to defaults
 */
export async function resetTheme() {
  await updateTheme(DEFAULT_THEME)
}

// Initialize - apply system theme immediately
if (typeof window !== 'undefined') {
  applySystemTheme()

  // Listen for system theme changes (for auto mode)
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    // This will be handled by the component when settings change
  })
}
