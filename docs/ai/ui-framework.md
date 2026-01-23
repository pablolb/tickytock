# UI Framework: Tabler UI

> **CRITICAL**: This app uses [Tabler UI](https://tabler.io/) - a Bootstrap-based UI framework. We aim to be as "Tabler native" as possible.

## Philosophy

**DO**: Use Tabler's built-in components and utilities  
**DON'T**: Write custom CSS/JS unless there's an excellent reason AND it's been confirmed with another person

## Documentation

Required reading before making UI changes:

1. **[Tabler UI Overview](https://docs.tabler.io/ui)** - Main documentation
2. **[Base Utilities](https://docs.tabler.io/ui/base)** - Colors, typography, spacing
3. **[Layout Components](https://docs.tabler.io/ui/layout)** - Navbars, tabs, page headers, layouts
4. **[UI Components](https://docs.tabler.io/ui/components)** - 40+ components (alerts, avatars, badges, buttons, cards, modals, tables, etc.)
5. **[Form Components](https://docs.tabler.io/ui/forms)** - Form elements, validation, input masks, select groups

## What Tabler Provides

### Layout

- Navbars (responsive navigation)
- Navs and tabs
- Page headers
- Page layouts (dashboard patterns)

### Components

- Alerts, Badges, Buttons, Cards
- Modals, Offcanvas (sidebars)
- Tables, Timelines
- Dropdowns, Tooltips, Popovers
- Progress bars, Spinners, Toasts
- Pagination, Breadcrumbs
- Avatars, Icons (Tabler Icons)
- Empty states, Placeholders

### Forms

- Form elements (inputs, selects, textareas)
- Validation states
- Input masks
- Color check, Image check
- Form helpers
- Select groups
- Form fieldsets

### Utilities

- Colors (semantic: primary, secondary, success, danger, etc.)
- Typography (headings, text sizes, weights)
- Spacing (margins, padding using Bootstrap classes: `mb-3`, `p-4`, etc.)
- Borders, Cursors, Alignment
- Display utilities

## Common Tabler Patterns Used in This App

### Cards

```svelte
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
  </div>
  <div class="card-body">Content</div>
</div>
```

### Buttons

```svelte
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-sm btn-danger">Small Delete</button>
```

**Note:** All buttons in this app have a global `min-height: 44px` override in `src/app.css` for iOS touch target accessibility. You don't need to add custom CSS for this.

### Forms

```svelte
<div class="mb-3">
  <label class="form-label">Task</label>
  <input type="text" class="form-control" placeholder="What are you working on?" />
</div>
```

### Lists

```svelte
<div class="list-group">
  <div class="list-group-item">Item content</div>
</div>
```

### Badges

```svelte
<span class="badge bg-success-subtle text-success">Running</span>
<span class="badge badge-outline text-secondary">Tag</span>
```

### Spacing (Bootstrap classes)

```svelte
<div class="mb-3">Margin bottom 3</div>
<div class="p-4">Padding 4</div>
<div class="d-flex gap-2">Flex with gap</div>
```

## When Custom CSS Is Acceptable

Only add custom CSS if:

1. **Tabler doesn't provide the pattern** (rare - check docs thoroughly first)
2. **You've confirmed with another person** it's necessary
3. **It's truly app-specific** (not something Tabler should handle)

### Example of Acceptable Custom CSS

```css
/* App-specific layout that Tabler doesn't provide */
.activity-timeline {
  position: relative;
}

.activity-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--tblr-border-color);
}
```

**Note:** We already have a global accessibility override for button touch targets (`min-height: 44px`) in `src/app.css`. Don't add this as custom CSS in components.

## How to Check If Tabler Has What You Need

1. Search the [Tabler UI docs](https://docs.tabler.io/ui)
2. Check the [components page](https://docs.tabler.io/ui/components) for similar UI patterns
3. Look at existing components in `src/components/` for patterns
4. Use browser DevTools to inspect Tabler's demo site

## Finding Custom CSS in the App

Review existing components - most custom CSS should be questioned:

```bash
# Find components with custom styles
grep -l "<style>" src/components/*.svelte
```

If you find custom CSS, ask:

- Can this be done with Tabler classes?
- Is this truly necessary?
- Should this be removed?

## Accessibility Best Practices

Tabler UI is built on Bootstrap, which has good accessibility defaults. Enhance them:

### Labels and Inputs

```svelte
<!-- ✅ GOOD - proper label association -->
<label class="form-label" for="username">Username</label>
<input id="username" type="text" class="form-control" />

<!-- ❌ BAD - no label association -->
<label class="form-label">Username</label>
<input type="text" class="form-control" />
```

### Buttons

```svelte
<!-- ✅ GOOD - descriptive text -->
<button class="btn btn-primary">Create Account</button>

<!-- ✅ GOOD - aria-label for icon-only buttons -->
<button class="btn btn-icon" aria-label="Delete activity">
  <IconTrash />
</button>

<!-- ❌ BAD - no accessible name -->
<button class="btn btn-icon">
  <IconTrash />
</button>
```

### Form Validation

```svelte
<!-- ✅ GOOD - Bootstrap validation classes -->
<input
  type="password"
  class="form-control"
  class:is-valid={isValid}
  class:is-invalid={isInvalid}
  aria-invalid={isInvalid}
/>
{#if isInvalid}
  <div class="invalid-feedback">Error message</div>
{/if}
```

### Alerts and Messages

```svelte
<!-- ✅ GOOD - role="alert" for important messages -->
<div class="alert alert-danger" role="alert">
  {error}
</div>
```

## Color Semantics

Use Tabler's semantic color classes:

- `btn-primary`, `bg-primary` - Primary actions
- `btn-secondary`, `text-secondary` - Secondary/muted content
- `btn-success`, `bg-success-subtle` - Success states
- `btn-danger`, `text-danger` - Destructive actions, errors
- `btn-warning`, `bg-warning` - Warnings
- `btn-info`, `bg-info` - Informational

## Responsive Design

Tabler includes Bootstrap's responsive utilities:

```svelte
<!-- Hide on mobile, show on desktop -->
<div class="d-none d-md-block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="d-md-none">Mobile only</div>

<!-- Responsive spacing -->
<div class="p-2 p-md-4">Small padding on mobile, larger on desktop</div>
```

## Common Mistakes to Avoid

### ❌ Don't Reinvent Tabler Components

```svelte
<!-- ❌ BAD - custom modal -->
<div class="custom-modal">
  <div class="custom-backdrop"></div>
  <div class="custom-dialog">...</div>
</div>

<!-- ✅ GOOD - use Tabler's modal -->
<div class="modal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">...</div>
  </div>
</div>
```

### ❌ Don't Use Inline Styles

```svelte
<!-- ❌ BAD -->
<div style="margin-bottom: 1rem; padding: 1rem;">

<!-- ✅ GOOD - use utility classes -->
<div class="mb-3 p-3">
```

### ❌ Don't Override Tabler Variables Without Good Reason

```css
/* ❌ BAD - changes global theme */
:root {
  --tblr-primary: #ff0000;
}

/* ✅ GOOD - use existing color classes or add app-specific class */
.special-button {
  /* Only if truly needed and documented */
}
```

## Icons

Use [@tabler/icons-svelte](https://github.com/tabler/tabler-icons) for consistent iconography:

```svelte
<script>
  import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-svelte'
</script>

<button class="btn btn-success">
  <IconCheck /> Save
</button>
```

## When in Doubt

1. Check if Tabler has the component
2. Look at existing TickyTock components for patterns
3. Search Tabler docs for similar use cases
4. Ask before writing custom CSS/JS

**Remember**: Tabler provides most of what you need. Custom code should be the exception, not the rule.
