# Common Pitfalls & Anti-Patterns

> **TL;DR**: Things NOT to do when working on TickyTock. Learn from past mistakes!

## Architecture Anti-Patterns

### ❌ DON'T: Return Documents from Mutations

```typescript
// WRONG - methods return void now
async createActivity(data: Activity): Promise<ActivityDoc> {
  const doc = await this.store.put('activity', data)
  return doc // NO!
}
```

**Why?** Events update state asynchronously. Returning early creates race conditions between your return value and the event system.

**Do instead:**

```typescript
// CORRECT - fire-and-forget
async createActivity(data: Activity): Promise<void> {
  await this.store.put('activity', data)
  // UI updates automatically via events
}
```

### ❌ DON'T: Manually Update $state

```typescript
// WRONG - bypasses encryption and events
this.activities.push(newActivity)
```

**Why?** Skips encryption, doesn't persist to IndexedDB, breaks sync.

**Do instead:**

```typescript
// CORRECT - go through the store
await activityStore.createActivity(newActivity)
```

### ❌ DON'T: Use onMount for Data Loading

```typescript
// WRONG - old imperative pattern
onMount(async () => {
  activities = await getAllActivities()
})
```

**Why?** Not reactive. Data doesn't update when changes occur.

**Do instead:**

```typescript
// CORRECT - reactive pattern
const activityStore = getActivityStore()
let activities = $derived(activityStore.todayStats.activities)
```

### ❌ DON'T: Poll for Changes

```typescript
// WRONG - wasteful and unreactive
setInterval(async () => {
  activities = await activityStore.getActivities()
}, 1000)
```

**Why?** Events handle this automatically. Polling is wasteful and creates stale data issues.

**Do instead:**

```typescript
// CORRECT - events drive updates
// Just use $derived - it updates automatically!
let activities = $derived(activityStore.todayStats.activities)
```

### ❌ DON'T: Add Timeouts to "Wait for Events"

```typescript
// WRONG - fragile and slow
await dataStore.saveActivity(data)
await new Promise((resolve) => setTimeout(resolve, 100))
expect(activities).toHaveLength(1)
```

**Why?** Flaky tests, race conditions. Events should fire synchronously in the same tick when possible.

**Do instead:**

```typescript
// CORRECT in tests - use proper wait utilities
await dataStore.saveActivity(data)
await waitFor(() => expect(activities).toHaveLength(1))
```

## Import Anti-Patterns

### ❌ DON'T: Import Deleted Files

```typescript
// WRONG - this file was deleted!
import { activities } from '../lib/activities.svelte'
```

**Deleted files:**

- `activities.svelte.ts` - Use `activityStore.svelte.ts` instead

**Why?** These files were removed during the reactive refactoring. They were redundant abstraction layers.

### ❌ DON'T: Import DataStore in Components

```typescript
// WRONG - components shouldn't access DataStore directly
import { getDataStore } from '../lib/dataStore.svelte'

const dataStore = getDataStore()
await dataStore.saveActivity(data)
```

**Why?** Components should only interact with ActivityStore. DataStore is an implementation detail.

**Do instead:**

```typescript
// CORRECT - use ActivityStore
import { getActivityStore } from '../lib/activityStore.svelte'

const activityStore = getActivityStore()
await activityStore.createActivity(data)
```

## UI/CSS Anti-Patterns

### ❌ DON'T: Create Wrapper Components for Tabler Elements

```svelte
<!-- WRONG - unnecessary abstraction -->
<script lang="ts">
  // Button.svelte
  let { variant, size, ...props } = $props()
  const variantClass = $derived(`btn-${variant}`)
  const sizeClass = $derived(size === 'sm' ? 'btn-sm' : '')
</script>

<button class="btn {variantClass} {sizeClass}" {...props}>
  {@render children()}
</button>

<!-- Then in components: -->
<Button variant="primary" size="lg">Click me</Button>
```

**Why?**

- Developers need to learn custom API instead of Tabler docs
- Doesn't match Tabler documentation
- Adds maintenance burden
- Makes it harder to use other Tabler button features
- Creates unnecessary abstraction layer

**Do instead:**

```svelte
<!-- CORRECT - use Tabler directly -->
<button type="button" class="btn btn-primary btn-lg">Click me</button>
```

**Note:** We previously had a `Button.svelte` component that was deleted. Use native HTML with Tabler classes instead.

### ❌ DON'T: Write Custom CSS Without Checking Tabler

```css
/* WRONG - Tabler already has this */
.my-button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background: #007bff;
}
```

**Why?** Tabler provides comprehensive utilities. Custom CSS creates maintenance burden.

**Do instead:**

```svelte
<!-- CORRECT - use Tabler classes -->
<button class="btn btn-primary">Click me</button>
```

### ❌ DON'T: Use Inline Styles

```svelte
<!-- WRONG -->
<div style="margin-bottom: 1rem; padding: 2rem;">
```

**Why?** Not maintainable, breaks responsive design, harder to theme.

**Do instead:**

```svelte
<!-- CORRECT - use utility classes -->
<div class="mb-3 p-4">
```

### ❌ DON'T: Override Tabler Variables Globally

```css
/* WRONG - changes entire theme */
:root {
  --tblr-primary: #ff0000;
}
```

**Why?** Affects the entire app. Hard to maintain consistency.

**Do instead:**

```svelte
<!-- CORRECT - use existing color utilities or semantic classes -->
<button class="btn btn-danger">Delete</button>
```

## Testing Anti-Patterns

### ❌ DON'T: Use CSS Selectors in E2E Tests

```typescript
// WRONG - fragile, implementation-specific
await page.locator('.btn-primary').click()
await page.locator('button[type="submit"]').first().click()
```

**Why?** Breaks when CSS classes change. Not semantic or accessible.

**Do instead:**

```typescript
// CORRECT - role-based, semantic
await page.getByRole('button', { name: /create account/i }).click()
```

### ❌ DON'T: Use Arbitrary Timeouts

```typescript
// WRONG - flaky and slow
await page.waitForTimeout(1000)
```

**Why?** Tests become slow and flaky. 1000ms might not be enough, or might be too much.

**Do instead:**

```typescript
// CORRECT - wait for specific conditions
await page.getByRole('heading', { name: /start activity/i }).waitFor()
await expect(page.getByText('Success')).toBeVisible()
```

### ❌ DON'T: Test Implementation Details

```gherkin
# WRONG - tests internal state
When I call the createActivity function
Then the activities array should have 1 item

# CORRECT - tests user behavior
When I fill in the activity form and click "Start"
Then I should see the activity in my list
```

## TypeScript Anti-Patterns

### ❌ DON'T: Use `any`

```typescript
// WRONG - loses type safety
function handleData(data: any) {
  return data.task
}
```

**Why?** Defeats the purpose of TypeScript. Hides bugs.

**Do instead:**

```typescript
// CORRECT - use proper types
function handleData(data: Activity) {
  return data.task
}
```

### ❌ DON'T: Disable ESLint Rules Globally

```typescript
/* eslint-disable @typescript-eslint/no-unused-vars */
// entire file...
```

**Why?** Hides real issues. Makes code harder to maintain.

**Do instead:**

```typescript
// CORRECT - fix the issue or disable per-line
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedButNeeded = value
```

## State Management Anti-Patterns

### ❌ DON'T: Create New Abstraction Layers

```typescript
// WRONG - unnecessary layer
class ActivityManager {
  constructor(private store: ActivityStore) {}

  async create(data: Activity) {
    return this.store.createActivity(data)
  }
}
```

**Why?** We simplified to 3 layers. More layers = more complexity.

**Current architecture:**

- **Components** (UI)
- **ActivityStore** (Business logic)
- **DataStore** (Storage)

Don't add more!

### ❌ DON'T: Mix Reactive and Imperative Patterns

```typescript
// WRONG - mixing patterns
let activities = $state([])

async function loadActivities() {
  activities = await fetch('/api/activities')
}

onMount(() => loadActivities())
```

**Why?** Creates confusion. Pick one pattern and stick with it.

**Do instead:**

```typescript
// CORRECT - fully reactive
const activityStore = getActivityStore()
let activities = $derived(activityStore.todayStats.activities)
```

## Security Anti-Patterns

### ❌ DON'T: Store Passphrases in Plain Text

```typescript
// WRONG - passphrase in localStorage
localStorage.setItem('passphrase', passphrase)
```

**Why?** Security vulnerability. Passphrases should never persist.

**Do instead:**

```typescript
// CORRECT - keep in memory only during session
// When user locks app, passphrase is cleared
```

### ❌ DON'T: Log Sensitive Data

```typescript
// WRONG - logs encrypted data structure
console.log('Activity:', activity)
```

**Why?** Could expose sensitive information in production logs.

**Do instead:**

```typescript
// CORRECT - log IDs or non-sensitive data only
console.log('Activity ID:', activity._id)
```

## Migration Notes

### January 2025 Refactoring

The app was refactored from hybrid reactive/imperative to **fully reactive**:

**What Changed:**

- Mutations now return `Promise<void>` (not documents)
- Events drive all state updates (no manual state manipulation)
- Deleted `activities.svelte.ts` (redundant layer)
- Simplified to 3-layer architecture

**If you see old patterns:**

- Update them to the new reactive pattern
- Don't try to "fix" the reactive pattern by adding back imperative code
- Trust the event system

## File-Specific Warnings

### Config Files

Some config files are intentionally **not linted**:

- `vite.config.ts` - Build config
- `vitest.config.ts` - Test config
- `cucumber.config.cjs` - E2E config (CommonJS)

But these **are linted**:

- `playwright.config.ts` - TypeScript code
- `tsconfig*.json` - Type checked for validity

### Generated Files

Never edit these manually:

- `e2e/reports/**` - Generated test reports (gitignored)
- `dist/**` - Build output
- `node_modules/**` - Dependencies

## When Stuck

1. ✅ Read [architecture.md](./architecture.md) - Understand the data flow
2. ✅ Check existing components for patterns
3. ✅ Search Tabler docs for UI patterns
4. ✅ Run tests to verify your changes work
5. ✅ Ask for help if something seems overly complex

**Remember:** Simple, reactive, Tabler-native code is the goal!
