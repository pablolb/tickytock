# Architecture Guide

> **Core principle**: This is a **fully reactive Svelte 5 app** with encrypted storage. All mutations are fire-and-forget. Events drive state updates.

## Data Flow

```
User Action → Mutation → EncryptedPouch → Event → $state Update → UI
```

### Example Flow

```typescript
// 1. User clicks "Stop Activity"
await activityStore.stopActivity(id)

// 2. Mutation writes to EncryptedPouch (encrypted)
await store.put('activity', { ...activity, to: Date.now() })

// 3. EncryptedPouch fires onChange event (decrypted)
onChange: (changes) => {
  // 4. Event handler updates $state
  this.activities = this.activities.map((a) => (a._id === doc._id ? doc : a))
}

// 5. UI updates automatically via $derived
let runningActivities = $derived(activityStore.runningActivities)
```

## Layer Responsibilities

### 1. Components (UI Layer)

- Read reactive state via `$derived`
- Call mutation methods (fire-and-forget)
- **NEVER** manually update state
- **NEVER** directly access DataStore

```typescript
// ✅ CORRECT
const activityStore = getActivityStore()
let activities = $derived(activityStore.todayStats.activities)

async function handleStop(id: string) {
  await activityStore.stopActivity(id)
  // UI updates automatically - don't try to refresh!
}
```

### 2. ActivityStore (Business Logic Layer)

- Provides reactive computed state via `$derived`
- Orchestrates DataStore mutations
- Returns `Promise<void>` (no data returned)
- Computed stats: `todayStats`, `runningActivities`, `uniqueTags`

```typescript
// ✅ CORRECT - Fire-and-forget
async stopActivity(id: string): Promise<void> {
  const activity = this.dataStore.getActivityById(id)
  if (!activity) return

  await this.dataStore.updateActivity(id, { to: Date.now() })
  // No return value - events handle state updates
}
```

### 3. DataStore (Storage Layer)

- Manages EncryptedPouch instance
- Handles onChange events
- Updates `$state` arrays
- All mutations return `Promise<void>`

```typescript
// ✅ CORRECT - Updates state via events
private handleChange(changes: Change[]) {
  for (const change of changes) {
    for (const doc of change.docs) {
      if (change.type === 'created') {
        this.activities.push(doc)
      } else if (change.type === 'updated') {
        const index = this.activities.findIndex(a => a._id === doc._id)
        if (index >= 0) this.activities[index] = doc
      }
    }
  }
}
```

## Critical Patterns

### ✅ DO: Fire-and-Forget Mutations

```typescript
// Component
async function handleStop(id: string) {
  await activityStore.stopActivity(id)
  // UI updates automatically via events - don't try to "refresh" manually
}
```

### ❌ DON'T: Wait for Return Values

```typescript
// WRONG - methods return void now
const savedDoc = await dataStore.saveActivity(data) // Type error!
```

### ✅ DO: Use $derived for Reactive Data

```typescript
// Component
const activityStore = getActivityStore()
let activities = $derived(activityStore.todayStats.activities)
// Auto-updates when activities change
```

### ❌ DON'T: Use onMount + Manual Loading

```typescript
// WRONG - old imperative pattern
onMount(async () => {
  activities = await getAllActivities()
})
```

### ✅ DO: Trust the Reactive System

```typescript
// Component automatically updates when state changes
let total = $derived(activityStore.todayStats.activities.reduce((sum, a) => sum + duration(a), 0))
```

### ❌ DON'T: Manually Update $state

```typescript
// WRONG - events should do this
activities.push(newActivity) // Bypasses encryption & events!
```

## Strange But Intentional: @mrbelloc/encrypted-pouch

This is a **custom library** built specifically for this app.

### How It Works

```typescript
// Setup
const store = new EncryptedPouch(db, password, {
  onChange: (changes) => {
    // Receives DECRYPTED docs
    for (const change of changes) {
      for (const doc of change.docs) {
        this.activities.push(doc) // Update $state
      }
    }
  },
})

// Write (encrypts before storing)
await store.put('activity', { task: 'Work on project' })
// → Encrypts doc
// → Writes to PouchDB (IndexedDB)
// → Fires onChange event with DECRYPTED doc
// → Your handler updates $state
```

### Why This Pattern?

1. **Privacy**: Data encrypted at rest in IndexedDB
2. **Reactivity**: Events drive state updates (Svelte-friendly)
3. **Simplicity**: No need to manually decrypt on read
4. **Sync-ready**: Works seamlessly with CouchDB replication

### Common Confusion

**Q**: "Why not just return the saved document?"  
**A**: Because events update state asynchronously. Returning early creates race conditions.

**Q**: "Why wait for events instead of updating state directly?"  
**A**: Events handle both local writes AND remote sync changes. One code path.

**Q**: "What if I need the saved document immediately?"  
**A**: You don't. The UI is reactive - it updates when state updates via events.

## Store Organization

### Stores (src/lib/\*.svelte.ts)

- **dataStore.svelte.ts** - Low-level encrypted storage, manages EncryptedPouch
- **activityStore.svelte.ts** - High-level reactive store with computed stats
- **auth.svelte.ts** - Authentication state (locked/unlocked)
- **filterStore.svelte.ts** - UI filter state
- **toastStore.svelte.ts** - Notification system
- **themeStore.svelte.ts** - Theme management

### Component Patterns

#### Reading Data (Reactive)

```typescript
import { getActivityStore } from '../lib/activityStore.svelte'

const activityStore = getActivityStore()

// Reactive - updates automatically
let runningActivities = $derived(activityStore.runningActivities)
let todayStats = $derived(activityStore.todayStats)
let uniqueTags = $derived(activityStore.uniqueTags)
```

#### Writing Data (Fire-and-Forget)

```typescript
// Create
await activityStore.createActivity({
  task: 'New task',
  tags: ['work'],
  from: Date.now(),
  to: null,
})

// Update
await activityStore.updateActivity(id, { to: Date.now() })

// Delete
await activityStore.deleteActivity(id)

// UI updates automatically - don't manually refresh!
```

## Multi-Account Support

Users can have multiple accounts (work, personal, etc.):

```typescript
// Each account gets its own:
// - Database (PouchDB instance)
// - Passphrase
// - App ID (unique identifier)
// - Optional CouchDB sync config

// Stored in localStorage as encrypted metadata
```

## Sync Architecture

**Optional** - app works fully offline:

```typescript
// If sync is enabled in settings
await dataStore.connectRemote({
  url: 'https://my-couchdb.example.com/db',
  username: 'user',
  password: 'pass',
})

// Continuous bidirectional sync
// Remote changes → PouchDB → onChange events → $state updates
```

## TypeScript Types

```typescript
// Core types (src/lib/types.ts)
interface Activity {
  task: string
  tags: string[]
  from: number // timestamp
  to: number | null // null = running
  timezone: string
}

interface ActivityDoc extends Activity {
  _id: string
  _rev?: string // PouchDB revision
}

interface Settings {
  syncMode: 'manual' | 'auto'
  autoStopRunning: boolean
  couchdb?: CouchDBConfig
  theme: 'light' | 'dark' | 'auto'
}
```

## Performance Notes

- **All reads are synchronous** (from memory)
- **All writes are async** (encryption + IndexedDB)
- **Stats pre-calculated** every 10s for running activities
- **No pagination needed** (personal time tracker, not enterprise app)
- **Search is in-memory** (fast enough for years of data)

## Security Notes

1. Passphrase unlocks database
2. Data encrypted at rest (IndexedDB)
3. Plaintext only in memory during session
4. Lock app → memory cleared
5. Sync sends encrypted blobs (server can't decrypt)

## Adding a New Feature

1. Add types to `src/lib/types.ts`
2. Add storage logic to `dataStore.svelte.ts` (if needed)
3. Add reactive getters to `activityStore.svelte.ts`
4. Create component in `src/components/`
5. Use `$derived` for reactive data
6. Use fire-and-forget mutations

## Debugging Reactive Issues

```typescript
// Check if events are firing
private handleChange(changes) {
  console.log('[DataStore] onChange:', changes) // Add logging
  // ... update state
}

// Check if state is updating
$effect(() => {
  console.log('Activities changed:', dataStore.activities)
})
```

## Recent Refactoring (Jan 2025)

The app was recently refactored from a hybrid reactive/imperative pattern to **fully reactive**:

- **Before**: Mutations returned docs, used timeouts to wait for events
- **After**: Mutations return void, events update state, UI reacts automatically
- **Deleted**: `activities.svelte.ts` (redundant abstraction layer)
- **Simplified**: 3-layer architecture (DataStore → ActivityStore → Components)

If you see old patterns in components, they should be updated to the new reactive pattern.
