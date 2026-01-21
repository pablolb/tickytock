/**
 * Database access is now controlled through the auth module.
 * Use getDataStore() from auth.svelte.ts to access the encrypted database.
 *
 * This ensures the app is unlocked before database operations can occur.
 */
import { getDataStore } from './auth.svelte'

export { getDataStore }
