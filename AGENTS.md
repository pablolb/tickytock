# AI Agent Guide for TickyTock

> **TL;DR**: This is a **fully reactive Svelte 5 app** with encrypted storage. All mutations are fire-and-forget. Events drive state updates. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

## Quick Start for AI Agents

### Essential Context

1. **Data Flow**: User Action → Mutation → EncryptedPouch → Event → $state Update → UI
2. **Never return docs from mutations** - They all return `Promise<void>`
3. **Never manually update state** - Events do it automatically
4. **Never import `activities.svelte.ts`** - That file was deleted (use `activityStore.svelte.ts`)
5. **UI Framework**: Use Tabler UI components - avoid custom CSS/JS unless absolutely necessary

### Architecture Overview

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details including:

- Data flow diagram (mermaid)
- Layer responsibilities
- State management patterns
- Common anti-patterns to avoid

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

## Strange But Intentional: @mrbelloc/encrypted-pouch

This is a **custom library** built specifically for this app. Key characteristics:

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

## Testing with EncryptedPouch

```typescript
// Always wait for events in tests
await dataStore.saveActivity(data)
await waitForUpdate() // Give events time to fire
expect(dataStore.activities).toHaveLength(1)
```

## Component Patterns

### Reading Data (Reactive)

```typescript
import { getActivityStore } from '../lib/activityStore.svelte'

const activityStore = getActivityStore()

// Reactive - updates automatically
let runningActivities = $derived(activityStore.runningActivities)
let todayStats = $derived(activityStore.todayStats)
let uniqueTags = $derived(activityStore.uniqueTags)
```

### Writing Data (Fire-and-Forget)

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

## Code Organization

### Stores (src/lib/\*.svelte.ts)

- **dataStore.svelte.ts** - Low-level encrypted storage, manages EncryptedPouch
- **activityStore.svelte.ts** - High-level reactive store with computed stats
- **auth.svelte.ts** - Authentication state (locked/unlocked)
- **filterStore.svelte.ts** - UI filter state
- **toastStore.svelte.ts** - Notification system
- **themeStore.svelte.ts** - Theme management

### Components (src/components/)

**Views** (full-screen):

- `MainView.svelte` - Main app interface (when unlocked)
- `UnlockView.svelte` - Login screen
- `ActivitiesView.svelte` - Activity list with timeline
- `StatsView.svelte` - Charts and statistics
- `SettingsView.svelte` - App settings and sync config

**Forms**:

- `NewActivityForm.svelte` - Quick start activity
- `ManualActivityForm.svelte` - Add past activity
- `EditActivityForm.svelte` - Edit existing activity

**UI Components**:

- `ActivityItem.svelte` - Single activity in list
- `FilterPanel.svelte` - Date/tag filtering
- `SyncIndicator.svelte` - Sync status badge
- Plus various small components (Button, Toast, etc.)

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

## Common Tasks for AI Agents

### Adding a New Feature

1. Add types to `src/lib/types.ts`
2. Add storage logic to `dataStore.svelte.ts` (if needed)
3. Add reactive getters to `activityStore.svelte.ts`
4. Create component in `src/components/`
5. Use `$derived` for reactive data
6. Use fire-and-forget mutations

### Debugging Reactive Issues

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

### Updating Dependencies

```bash
npm update
npm test  # Run tests
npm run build  # Verify build works
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

## What NOT to Do

1. ❌ Return documents from mutations
2. ❌ Manually update `$state` arrays (let events do it)
3. ❌ Poll for changes (events handle everything)
4. ❌ Use `onMount` for loading data (use `$derived`)
5. ❌ Import deleted files like `activities.svelte.ts`
6. ❌ Add timeouts to "wait for events" (proper fix: events should be synchronous in same tick if possible)
7. ❌ Create new abstraction layers (we simplified to 3: DataStore, ActivityStore, Components)
8. ❌ Write custom CSS/JS without checking Tabler docs first and getting confirmation

## What TO Do

1. ✅ Read [ARCHITECTURE.md](./ARCHITECTURE.md) before making changes
2. ✅ Use fire-and-forget mutations
3. ✅ Trust the reactive system
4. ✅ Add types to `types.ts`
5. ✅ Write tests for new features
6. ✅ Use `$derived` for computed values
7. ✅ Keep components simple (read from store, call mutations)
8. ✅ Use Tabler UI components and utilities - check [docs](https://docs.tabler.io/ui) first

## Testing Strategy

```typescript
// Unit tests
describe('DataStore', () => {
  it('should update reactively', async () => {
    await dataStore.saveActivity(data)
    await waitForUpdate() // Wait for events
    expect(dataStore.activities).toHaveLength(1)
  })
})

// Integration tests
// - Test full user flows
// - Test sync scenarios
// - Test edge cases (offline, conflicts, etc.)
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

## UI Framework: Tabler UI

**CRITICAL**: This app uses [Tabler UI](https://tabler.io/) - a Bootstrap-based UI framework. We aim to be as "Tabler native" as possible.

### Philosophy

**DO**: Use Tabler's built-in components and utilities  
**DON'T**: Write custom CSS/JS unless there's an excellent reason AND it's been confirmed with another person

### Tabler Documentation

Required reading before making UI changes:

1. **[Tabler UI Overview](https://docs.tabler.io/ui)** - Main documentation
2. **[Base Utilities](https://docs.tabler.io/ui/base)** - Colors, typography, spacing
3. **[Layout Components](https://docs.tabler.io/ui/layout)** - Navbars, tabs, page headers, layouts
4. **[UI Components](https://docs.tabler.io/ui/components)** - 40+ components (alerts, avatars, badges, buttons, cards, modals, tables, etc.)
5. **[Form Components](https://docs.tabler.io/ui/forms)** - Form elements, validation, input masks, select groups

### What Tabler Provides

**Layout:**

- Navbars (responsive navigation)
- Navs and tabs
- Page headers
- Page layouts (dashboard patterns)

**Components:**

- Alerts, Badges, Buttons, Cards
- Modals, Offcanvas (sidebars)
- Tables, Timelines
- Dropdowns, Tooltips, Popovers
- Progress bars, Spinners, Toasts
- Pagination, Breadcrumbs
- Avatars, Icons (Tabler Icons)
- Empty states, Placeholders

**Forms:**

- Form elements (inputs, selects, textareas)
- Validation states
- Input masks
- Color check, Image check
- Form helpers
- Select groups
- Form fieldsets

**Utilities:**

- Colors (semantic: primary, secondary, success, danger, etc.)
- Typography (headings, text sizes, weights)
- Spacing (margins, padding using Bootstrap classes: `mb-3`, `p-4`, etc.)
- Borders, Cursors, Alignment
- Display utilities

### Common Tabler Patterns Used in This App

```svelte
<!-- Cards -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
  </div>
  <div class="card-body">Content</div>
</div>

<!-- Buttons -->
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-sm btn-danger">Small Delete</button>

<!-- Forms -->
<div class="mb-3">
  <label class="form-label">Task</label>
  <input type="text" class="form-control" placeholder="What are you working on?" />
</div>

<!-- Lists -->
<div class="list-group">
  <div class="list-group-item">Item content</div>
</div>

<!-- Badges -->
<span class="badge bg-success-subtle text-success">Running</span>
<span class="badge badge-outline text-secondary">Tag</span>

<!-- Spacing (Bootstrap classes) -->
<div class="mb-3">Margin bottom 3</div>
<div class="p-4">Padding 4</div>
<div class="d-flex gap-2">Flex with gap</div>
```

### When Custom CSS Is Acceptable

Only add custom CSS if:

1. **Tabler doesn't provide the pattern** (rare - check docs thoroughly first)
2. **You've confirmed with another person** it's necessary
3. **It's truly app-specific** (not something Tabler should handle)

Example of acceptable custom CSS:

```css
/* Mobile-specific adjustments for touch targets */
@media (max-width: 640px) {
  .btn-list .btn {
    min-height: 44px; /* Accessibility: proper touch target size */
  }
}
```

### How to Check If Tabler Has What You Need

1. Search the [Tabler UI docs](https://docs.tabler.io/ui)
2. Check the [components page](https://docs.tabler.io/ui/components) for similar UI patterns
3. Look at existing components in `src/components/` for patterns
4. Use browser DevTools to inspect Tabler's demo site

### Current Custom CSS in the App

Review existing components - most custom CSS should be questioned:

```bash
# Find components with custom styles
grep -l "<style>" src/components/*.svelte
```

If you find custom CSS, ask:

- Can this be done with Tabler classes?
- Is this truly necessary?
- Should this be removed?

## Questions?

Read these in order:

1. [README.md](./README.md) - Project overview
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into architecture
3. This file - AI agent-specific tips
4. [Tabler UI Docs](https://docs.tabler.io/ui) - UI framework reference

## Version Info

- **Svelte**: 5 (using runes: `$state`, `$derived`, `$effect`)
- **TypeScript**: Latest
- **PouchDB**: Browser build with IndexedDB
- **Build Tool**: Vite
- **Test Runner**: Vitest

## Recent Refactoring (Jan 2025)

The app was recently refactored from a hybrid reactive/imperative pattern to **fully reactive**:

- **Before**: Mutations returned docs, used timeouts to wait for events
- **After**: Mutations return void, events update state, UI reacts automatically
- **Deleted**: `activities.svelte.ts` (redundant abstraction layer)
- **Simplified**: 3-layer architecture (DataStore → ActivityStore → Components)

If you see old patterns in components, they should be updated to the new reactive pattern.
