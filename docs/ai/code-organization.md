# Code Organization

> **TL;DR**: TickyTock follows a clear file structure with strict separation of concerns. Know where things go before you start coding.

## Project Structure

```
tickytock/
├── src/
│   ├── lib/                    # Shared logic and stores
│   │   ├── types.ts            # TypeScript interfaces and types
│   │   ├── dataStore.svelte.ts # Low-level encrypted storage
│   │   ├── activityStore.svelte.ts # Business logic layer
│   │   ├── auth.svelte.ts      # Authentication state
│   │   ├── filterStore.svelte.ts # UI filter state
│   │   ├── toastStore.svelte.ts  # Toast notifications
│   │   ├── themeStore.svelte.ts  # Theme management
│   │   ├── accounts.ts         # Account management utilities
│   │   ├── utils.ts            # Shared utility functions
│   │   └── e2eApi.ts           # E2E testing API (test mode only)
│   │
│   ├── components/             # Svelte components
│   │   ├── MainView.svelte     # Main app interface
│   │   ├── UnlockView.svelte   # Login screen
│   │   ├── CreateAccountView.svelte # Account creation
│   │   ├── ActivitiesView.svelte # Activity list with timeline
│   │   ├── StatsView.svelte    # Charts and statistics
│   │   ├── SettingsView.svelte # App settings
│   │   ├── NewActivityForm.svelte # Start new activity
│   │   ├── ManualActivityForm.svelte # Add past activity
│   │   ├── EditActivityForm.svelte # Edit existing activity
│   │   ├── ActivityItem.svelte # Single activity display
│   │   ├── FilterPanel.svelte  # Date/tag filtering
│   │   ├── Button.svelte       # Reusable button component
│   │   ├── Toast.svelte        # Toast notification
│   │   └── ...                 # Other UI components
│   │
│   ├── App.svelte              # Root component, routing
│   ├── main.ts                 # Entry point
│   └── app.css                 # Global styles (minimal)
│
├── e2e/                        # E2E tests (Cucumber + Playwright)
│   ├── features/               # Gherkin feature files
│   │   ├── unlock.feature
│   │   └── create-account.feature
│   ├── steps/                  # Step definitions (TypeScript)
│   │   ├── common.steps.ts
│   │   └── create-account.steps.ts
│   ├── support/                # Test utilities
│   │   ├── world.ts            # Cucumber world (test context)
│   │   └── server.ts           # Dev server management
│   └── reports/                # Generated reports (gitignored)
│
├── docs/                       # Documentation
│   └── ai/                     # AI agent guides
│       ├── architecture.md
│       ├── ui-framework.md
│       ├── e2e-testing.md
│       ├── code-organization.md
│       └── common-pitfalls.md
│
├── .github/workflows/          # CI/CD
│   └── e2e.yml                 # E2E test workflow
│
├── dist/                       # Build output (gitignored)
├── node_modules/               # Dependencies (gitignored)
│
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (src)
├── tsconfig.e2e.json           # TypeScript config (e2e)
├── vite.config.ts              # Build config
├── playwright.config.ts        # E2E test config
├── cucumber.config.cjs         # Cucumber config
├── eslint.config.js            # Linting rules
├── .prettierrc                 # Code formatting
├── .gitignore                  # Git exclusions
├── AGENTS.md                   # AI agent guide (index)
├── ARCHITECTURE.md             # Architecture deep dive
└── README.md                   # Project overview
```

## File Naming Conventions

### Components (`.svelte`)

- **PascalCase**: `ActivityItem.svelte`, `MainView.svelte`
- **Views suffix**: Full-screen pages end with `View` (e.g., `ActivitiesView.svelte`)
- **Form suffix**: Form components end with `Form` (e.g., `NewActivityForm.svelte`)

### Stores (`.svelte.ts`)

- **camelCase**: `activityStore.svelte.ts`, `dataStore.svelte.ts`
- **Store suffix**: Always end with `Store` (e.g., `filterStore.svelte.ts`)
- **Exception**: `auth.svelte.ts` (doesn't need suffix, it's clearly auth state)

### Utilities (`.ts`)

- **camelCase**: `utils.ts`, `accounts.ts`
- **Descriptive names**: Name reflects what's inside (e.g., `types.ts` for types)

### Tests (`.feature`, `.steps.ts`)

- **kebab-case features**: `create-account.feature`, `unlock.feature`
- **camelCase steps**: `common.steps.ts`, `createAccount.steps.ts`
- **Match feature to steps**: `create-account.feature` → `createAccount.steps.ts`

## Where Things Go

### Types (`src/lib/types.ts`)

All TypeScript interfaces and types:

```typescript
// Core domain types
interface Activity { ... }
interface ActivityDoc { ... }

// Config types
interface Settings { ... }
interface CouchDBConfig { ... }

// UI types
interface TodayStats { ... }
```

### Stores (`src/lib/*.svelte.ts`)

Reactive state management using Svelte 5 runes:

- **dataStore.svelte.ts** - Low-level storage (EncryptedPouch)
- **activityStore.svelte.ts** - Business logic (computed stats)
- **auth.svelte.ts** - Authentication state (locked/unlocked)
- **filterStore.svelte.ts** - UI filters (date range, tags)
- **toastStore.svelte.ts** - Toast notifications
- **themeStore.svelte.ts** - Theme preferences

### Components (`src/components/*.svelte`)

UI components only. No business logic:

**Views** (full-screen):

- Render data from stores using `$derived`
- Call store methods for mutations
- Handle routing and navigation

**Forms**:

- Local form state using `$state`
- Validation logic
- Call store methods on submit

**UI Components**:

- Reusable pieces (buttons, badges, modals)
- Props for configuration
- Emit events for actions

### Utilities (`src/lib/*.ts`)

Pure functions and helpers:

- **utils.ts** - Date formatting, duration calculation, etc.
- **accounts.ts** - Account CRUD operations (localStorage)
- **e2eApi.ts** - E2E testing helpers (test mode only)

### E2E Tests (`e2e/`)

Behavior-driven tests:

- **features/** - User stories in Gherkin
- **steps/** - Step definitions in TypeScript
- **support/** - Test utilities and world setup

## Import Patterns

### Components Import Stores

```typescript
// ✅ CORRECT
import { getActivityStore } from '../lib/activityStore.svelte'

const activityStore = getActivityStore()
let activities = $derived(activityStore.todayStats.activities)
```

### Stores Import Other Stores

```typescript
// ✅ CORRECT (if needed)
import { getDataStore } from './dataStore.svelte'

class ActivityStore {
  private dataStore = getDataStore()
}
```

### Components Import Types

```typescript
// ✅ CORRECT
import type { Activity, ActivityDoc } from '../lib/types'
```

### Utilities Import Nothing (Usually)

```typescript
// ✅ CORRECT - pure functions
export function formatDuration(ms: number): string {
  // ...
}
```

## Svelte 5 Runes Usage

### In Stores (`.svelte.ts`)

```typescript
// Use $state for reactive state
let activities = $state<ActivityDoc[]>([])

// Use $derived for computed values
let runningActivities = $derived(activities.filter((a) => a.to === null))
```

### In Components (`.svelte`)

```typescript
<script lang="ts">
  // Import stores
  const activityStore = getActivityStore()

  // Derive reactive values
  let activities = $derived(activityStore.todayStats.activities)

  // Local component state
  let showModal = $state(false)

  // Effects (rarely needed)
  $effect(() => {
    console.log('Activities changed:', activities.length)
  })
</script>
```

## Dependency Rules

### Layers (from bottom to top)

```
Components (UI)
    ↓
ActivityStore (Business Logic)
    ↓
DataStore (Storage)
    ↓
EncryptedPouch (Library)
```

**Rules:**

- ✅ Components can import ActivityStore
- ✅ ActivityStore can import DataStore
- ❌ Components CANNOT import DataStore directly
- ❌ Lower layers CANNOT import upper layers

### Cross-Cutting Concerns

Some modules can be imported by any layer:

- `types.ts` - Type definitions
- `utils.ts` - Pure utility functions
- `auth.svelte.ts` - Authentication state

## Adding New Features

### 1. Define Types First

```typescript
// src/lib/types.ts
interface NewFeature {
  id: string
  name: string
  // ...
}
```

### 2. Add Storage Logic (if needed)

```typescript
// src/lib/dataStore.svelte.ts
async saveNewFeature(data: NewFeature): Promise<void> {
  await this.store.put('feature', data)
}
```

### 3. Add Business Logic

```typescript
// src/lib/activityStore.svelte.ts (or new store)
let features = $derived(this.dataStore.features.filter((f) => f.active))
```

### 4. Create Component

```svelte
<!-- src/components/NewFeatureView.svelte -->
<script lang="ts">
  const store = getActivityStore()
  let features = $derived(store.features)
</script>

<div class="card">
  {#each features as feature}
    <div>{feature.name}</div>
  {/each}
</div>
```

### 5. Add Route (if needed)

```typescript
// src/App.svelte
<Route path="/features" component={NewFeatureView} />
```

## Testing Organization

### Unit Tests (Vitest)

```typescript
// src/lib/__tests__/activityStore.test.ts
describe('ActivityStore', () => {
  it('should calculate today stats', () => {
    // ...
  })
})
```

### E2E Tests (Cucumber + Playwright)

```gherkin
# e2e/features/new-feature.feature
Feature: New Feature
  Scenario: User creates new feature
    Given I am logged in
    When I navigate to features
    Then I should see the feature form
```

```typescript
// e2e/steps/newFeature.steps.ts
When('I navigate to features', async function (this: TickyTockWorld) {
  await this.page.goto('/features')
})
```

## Style Organization

### Global Styles (`src/app.css`)

Minimal global styles only:

- CSS resets (if needed)
- Tabler UI imports
- App-wide custom properties (rare)

### Component Styles

Scoped to component using `<style>` block:

```svelte
<style>
  /* Minimal custom styles */
  /* Prefer Tabler classes over custom CSS */
  .special-layout {
    /* Only if Tabler doesn't provide it */
  }
</style>
```

## Scripts (package.json)

```json
{
  "dev": "vite", // Development server
  "dev:e2e": "VITE_MODE=test vite", // Dev server for E2E
  "build": "vite build", // Production build
  "preview": "vite preview", // Preview production build
  "test": "vitest", // Unit tests (watch mode)
  "test:run": "vitest run", // Unit tests (CI)
  "test:e2e": "cucumber-js", // E2E tests (headless)
  "test:e2e:headed": "HEADED=true cucumber-js", // E2E (visible)
  "check": "svelte-check && tsc", // Type check all
  "lint": "eslint .", // Lint all files
  "lint:fix": "eslint --fix .", // Fix lint issues
  "format": "prettier --write .", // Format all files
  "format:check": "prettier --check ." // Check formatting
}
```

## Environment Variables

None currently used! App is fully client-side.

For E2E tests:

- `VITE_MODE=test` - Enables test mode features
- `HEADED=true` - Run browser in headed mode

## Build Output

```
dist/
├── index.html          # Entry point
├── assets/             # Bundled JS/CSS
│   ├── index-[hash].js
│   └── index-[hash].css
└── manifest.webmanifest # PWA manifest
```

## Git Workflow

### Never Commit

- `node_modules/`
- `dist/`
- `e2e/reports/`
- `*.local` (local config)
- `.env` files

### Always Commit

- `src/` (all source code)
- `e2e/` (tests, not reports)
- `docs/` (documentation)
- `package.json` and `package-lock.json`
- Config files (`.eslintrc`, `tsconfig.json`, etc.)

## Quick Reference

**Need to add a type?** → `src/lib/types.ts`  
**Need to store data?** → `src/lib/dataStore.svelte.ts`  
**Need computed state?** → `src/lib/activityStore.svelte.ts`  
**Need a new page?** → `src/components/NewView.svelte`  
**Need a reusable component?** → `src/components/ComponentName.svelte`  
**Need an E2E test?** → `e2e/features/feature-name.feature`  
**Need a utility function?** → `src/lib/utils.ts`

**When in doubt, look at existing files for patterns!**
