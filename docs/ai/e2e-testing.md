# E2E Testing Best Practices

> **Core principle**: E2E tests should **test user behavior, not implementation details**. Write tests that would remain valid even if the underlying implementation changes.

## Testing Framework

- **Cucumber** - BDD-style feature files (Gherkin syntax)
- **Playwright** - Browser automation and assertions
- **TypeScript** - Type-safe step definitions

## Global Timeout Configuration

**✅ DO**: Configure timeouts globally in `e2e/support/world.ts`

```typescript
// In world.ts init() method
this.page.setDefaultTimeout(30000) // 30s for actions and waits
this.page.setDefaultNavigationTimeout(30000) // 30s for navigation

// At top of file
expect.configure({ timeout: 30000 }) // 30s for expect() assertions
```

This eliminates the need to specify `{ timeout: 5000 }` on every action.

**❌ DON'T**: Add timeout to individual actions

```typescript
// ❌ BAD - creates noise and maintenance burden
await expect(button).toBeVisible({ timeout: 5000 })
await page.waitForURL(/pattern/, { timeout: 5000 })

// ✅ GOOD - uses global timeout
await expect(button).toBeVisible()
await page.waitForURL(/pattern/)
```

**Exception**: Only specify timeout if you need a different value for a specific action:

```typescript
// OK - this specific operation needs longer
await page.waitForFunction(condition, { timeout: 60000 })
```

## Cucumber Hook Timeouts

**✅ DO**: Configure hook timeouts in `e2e/steps/common.steps.ts` for CI reliability

Cucumber hooks have a default 5-second timeout, which is too short for CI environments where operations take longer due to resource constraints.

```typescript
// BeforeAll: 60s for dev server startup (includes HTTP polling)
BeforeAll({ timeout: 60000 }, async function () {
  await startDevServer()
})

// Before: 30s for browser initialization (first run is slower in CI)
Before({ timeout: 30000 }, async function (this: TickyTockWorld) {
  await this.init()
})

// After: 15s for browser cleanup (usually fast, but timeout for safety)
After({ timeout: 15000 }, async function (this: TickyTockWorld) {
  await this.cleanup()
})

// AfterAll: default timeout is fine (stopping server is fast)
AfterAll(function () {
  stopDevServer()
})
```

**Why these timeouts?**

- **BeforeAll (60s)**: Starting Vite dev server + HTTP polling to verify it's responding
- **Before (30s)**: Launching Chromium browser (cold start in CI is slower)
- **After (15s)**: Closing browser/context (usually <1s, but adding buffer for CI)
- **AfterAll (default)**: Killing the dev server process is instant

**CI Warmup Issue**: The first scenario in a CI run takes longer because it's a cold start (browser initialization, etc.). Subsequent scenarios are faster.

## Locator Strategy (Priority Order)

Always prefer accessibility-focused locators:

### 1. Role-based Locators (BEST - most resilient)

```typescript
page.getByRole('button', { name: 'Create Account' })
page.getByRole('textbox', { name: 'Username' })
page.getByRole('heading', { name: /start activity/i })
```

**Why?** Roles are semantic, resilient to style changes, and test what assistive technologies see.

### 2. Label Text (GOOD - semantic)

```typescript
page.getByLabel('Username')
page.getByLabel('Passphrase')
```

**Why?** Labels are user-facing and ensure proper form accessibility.

### 3. Placeholder (ACCEPTABLE - visible to users)

```typescript
page.getByPlaceholder('Enter username')
```

**Why?** Users can see placeholders, but they're not as semantic as labels.

### 4. Test IDs (LAST RESORT - not visible to users)

```typescript
page.getByTestId('submit-button')
```

**Why?** Not user-facing, but better than brittle CSS selectors.

## ❌ AVOID These Locators

- **CSS classes**: `.btn-primary`, `.form-control` (implementation details, change frequently)
- **Generic selectors**: `button[type="submit"]` (fragile, not semantic, multiple matches)
- **XPath**: Too brittle, hard to read and maintain
- **nth-child/nth-of-type**: Breaks when DOM structure changes

## Writing E2E Tests: The Process

### Step 1: Inspect the Component First

**Before writing tests, read the actual component code:**

```typescript
// Example: Check CreateAccountView.svelte to see:
// - What roles are used? (button, textbox, form, etc.)
// - What labels exist? (for accessibility)
// - What type is the button? (submit, button, reset)
// - Are there proper ARIA attributes?
// - What is the actual button text?
```

### Step 2: Add Missing ARIA Attributes

If the component lacks proper accessibility attributes, **fix the component first**:

```svelte
<!-- ❌ BAD - no accessibility -->
<button onclick={handleSubmit}>Submit</button>

<!-- ✅ GOOD - proper role and label -->
<button type="submit" aria-label="Create account"> Create Account </button>

<!-- ✅ BETTER - semantic HTML (button text is implicit label) -->
<button type="submit">Create Account</button>

<!-- ✅ BEST - explicit ID and label association -->
<label for="username" class="form-label">Username</label>
<input id="username" name="username" type="text" aria-required="true" />
```

### Step 3: Write Resilient Step Definitions

```typescript
// ❌ BAD - fragile, implementation-specific
When('I click the submit button', async function (this: TickyTockWorld) {
  await this.page.locator('button[type="submit"]').click()
})

// ✅ GOOD - semantic, role-based
When('I click the {string} button', async function (this: TickyTockWorld, buttonText: string) {
  await this.page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
})

// ✅ GOOD - uses form semantics
When('I submit the form', async function (this: TickyTockWorld) {
  await this.page.keyboard.press('Enter')
})
```

### Step 4: Test Behavior, Not Implementation

```gherkin
# ❌ BAD - tests implementation
When I click the button with class "btn-primary"
And I wait for the API call to complete
Then the state should be updated

# ✅ GOOD - tests user-visible behavior
When I click the "Create Account" button
Then I should see the main app
And the account "Alice" should exist
```

## Common Patterns

### Form Submission

```typescript
// Pattern 1: Click submit button by text (explicit user action)
await page.getByRole('button', { name: /submit|create|save/i }).click()

// Pattern 2: Press Enter (common user behavior)
await page.keyboard.press('Enter')

// Pattern 3: Trigger form submit event (last resort)
await page.locator('form').evaluate((form) => form.requestSubmit())
```

### Form Inputs

```typescript
// ✅ PREFER: Label-based (requires proper <label for="id"> in component)
await page.getByLabel('Username').fill('alice')
await page.getByLabel('Passphrase').fill('secret123')

// ✅ ACCEPTABLE: Role + name
await page.getByRole('textbox', { name: 'Username' }).fill('alice')

// ⚠️ FALLBACK: Placeholder (file a bug to add proper labels!)
await page.getByPlaceholder('Enter username').fill('alice')
```

### Waiting for State Changes

```typescript
// ✅ Wait for visible elements (user perspective)
await page.getByRole('heading', { name: /start activity/i }).waitFor()

// ✅ Wait for navigation
await page.waitForURL('**/main')
await page.waitForURL(/\/device-accounts/)

// ✅ Wait for text to appear
await expect(page.getByText('Account created')).toBeVisible()

// ❌ NEVER use arbitrary timeouts
await page.waitForTimeout(1000) // WRONG - flaky and slow!
```

### Checking Visibility/State

```typescript
// ✅ Check what users see
await expect(page.getByText(/passphrases don't match/i)).toBeVisible()
await expect(page.getByRole('alert')).toContainText('Account created')

// ✅ Check button/input state
await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled()
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled()

// ✅ Check input values
await expect(page.getByLabel('Username')).toHaveValue('alice')
await expect(page.getByLabel('Agree to terms')).toBeChecked()

// ✅ Check validation states
await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
```

## Accessibility = Better Tests

When you add proper ARIA attributes for tests, **you're also improving accessibility** for:

- 🦯 Screen reader users
- ⌨️ Keyboard-only users
- 🤖 Automated accessibility tools
- 🔍 Search engine crawlers

**Win-win!**

## Required ARIA Attributes Checklist

When creating/updating components, ensure:

- ✅ All form inputs have associated `<label>` with `for` attribute
- ✅ Buttons have descriptive text content or `aria-label`
- ✅ Interactive elements have proper `role` (usually implicit from semantic HTML)
- ✅ Error messages have `role="alert"` or live region (`aria-live`)
- ✅ Disabled states use `disabled` attribute, not just CSS
- ✅ Loading states are communicated (`aria-busy`, `aria-live`)
- ✅ Required fields have `aria-required="true"` (or `required` attribute)
- ✅ Invalid fields have `aria-invalid="true"`

## E2E Test Checklist

Before committing E2E tests:

1. ✅ **Read the actual component code** - Don't guess locators
2. ✅ **Use role-based locators** - Not CSS classes or generic selectors
3. ✅ **Add missing ARIA attributes** to components (fix accessibility first)
4. ✅ **Test user-visible behavior** - Not implementation details
5. ✅ **Use regex for text matching** - Case-insensitive, flexible (`/text/i`)
6. ✅ **No arbitrary timeouts** - Wait for specific conditions
7. ✅ **Test in both modes** - Headed and headless
8. ✅ **Lint and type check** - Run `npm run lint` and `npm run check`

## Example: Good E2E Test Flow

### Feature File (Gherkin)

```gherkin
Feature: Create Account
  As a new user
  I want to create an account
  So I can start tracking my time

  Scenario: Create account successfully
    Given I am on the unlock page
    When I click the "Create Account" button
    And I fill in "Username" with "alice"
    And I fill in "Passphrase" with "secure-pass-123"
    And I fill in "Confirm Passphrase" with "secure-pass-123"
    And I click the "Create Account" button
    Then I should see the main app
    And the account "alice" should exist

  Scenario: Show error for mismatched passphrases
    Given I am on the unlock page
    When I click the "Create Account" button
    And I fill in "Username" with "bob"
    And I fill in "Passphrase" with "password123"
    And I fill in "Confirm Passphrase" with "different-password"
    Then I should see "Passphrases don't match"
    And the "Create Account" button should be disabled
```

### Step Definitions (TypeScript)

```typescript
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TickyTockWorld } from '../support/world.js'

Given('I am on the unlock page', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.goto('http://localhost:5173')
})

When('I click the {string} button', async function (this: TickyTockWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized')
  // Uses getByRole - requires button has text content or aria-label
  await this.page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
})

When(
  'I fill in {string} with {string}',
  async function (this: TickyTockWorld, label: string, value: string) {
    if (!this.page) throw new Error('Page not initialized')
    // Uses getByLabel - requires component has proper <label> elements
    await this.page.getByLabel(label).fill(value)
  }
)

Then('I should see {string}', async function (this: TickyTockWorld, text: string) {
  if (!this.page) throw new Error('Page not initialized')
  // Uses getByText - tests what user actually sees
  await expect(this.page.getByText(new RegExp(text, 'i'))).toBeVisible()
})

Then('I should see the main app', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  // Wait for specific heading that indicates main app loaded
  await this.page.getByRole('heading', { name: /start activity/i }).waitFor()
})

Then(
  'the account {string} should exist',
  async function (this: TickyTockWorld, accountName: string) {
    if (!this.page) throw new Error('Page not initialized')
    // Lock the app to go back to unlock screen
    await this.page.getByRole('button', { name: /lock/i }).click()
    // Verify account appears in the account list
    await expect(this.page.getByRole('button', { name: accountName })).toBeVisible()
  }
)

Then(
  'the {string} button should be disabled',
  async function (this: TickyTockWorld, buttonText: string) {
    if (!this.page) throw new Error('Page not initialized')
    await expect(
      this.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    ).toBeDisabled()
  }
)
```

## Common Mistakes to Avoid

### ❌ Guessing Locators

```typescript
// DON'T guess what the button text is
await page.getByRole('button', { name: 'Submit' }).click() // Might be "Create Account"

// DO: Read the component first, use exact or regex
await page.getByRole('button', { name: /create account/i }).click()
```

### ❌ Using Implementation Details

```typescript
// DON'T use CSS classes
await page.locator('.btn-primary').click()

// DO: Use semantic locators
await page.getByRole('button', { name: 'Create Account' }).click()
```

### ❌ Brittle Selectors

```typescript
// DON'T use position-based selectors
await page.locator('button').nth(2).click()

// DO: Use descriptive locators
await page.getByRole('button', { name: 'Delete' }).click()
```

### ❌ Testing Implementation

```gherkin
# DON'T test implementation details
When I call the "createActivity" function
Then the state should have 1 activity

# DO: Test user behavior
When I fill in the activity form
And I click "Start"
Then I should see the activity in the list
```

## Debugging Tips

### Run in Headed Mode

```bash
npm run test:e2e:headed
```

### Use Playwright Inspector

```bash
PWDEBUG=1 npm run test:e2e
```

### Add Debug Logging

```typescript
When('I click the {string} button', async function (this: TickyTockWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized')

  // Debug: Show all buttons
  const buttons = await this.page.getByRole('button').all()
  console.log('Available buttons:', await Promise.all(buttons.map((b) => b.textContent())))

  await this.page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
})
```

### Take Screenshots on Failure

```typescript
After(async function (this: TickyTockWorld, scenario) {
  if (scenario.result?.status === 'failed' && this.page) {
    const screenshot = await this.page.screenshot()
    this.attach(screenshot, 'image/png')
  }
})
```

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
- [Web Accessibility (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Running E2E Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run with browser visible (for debugging)
npm run test:e2e:headed

# Run in dev mode (with hot reload server)
npm run dev:e2e  # In one terminal
npm run test:e2e # In another terminal
```

## CI/CD Integration

E2E tests run automatically in GitHub Actions on push/PR. See `.github/workflows/e2e.yml`.

Reports are uploaded as artifacts with 7-day retention.
