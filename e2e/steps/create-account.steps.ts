import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TickyTockWorld } from '../support/world.js'

When('I click the {string} button', async function (this: TickyTockWorld, buttonText: string) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
})

When('I enter username {string}', async function (this: TickyTockWorld, username: string) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByLabel('Username').fill(username)
})

When('I enter passphrase {string}', async function (this: TickyTockWorld, passphrase: string) {
  if (!this.page) throw new Error('Page not initialized')
  // Get the first passphrase field (not the confirm field)
  await this.page.getByLabel('Passphrase', { exact: true }).fill(passphrase)
})

When('I confirm passphrase {string}', async function (this: TickyTockWorld, passphrase: string) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByLabel('Confirm Passphrase').fill(passphrase)
})

When('I submit the create account form', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  // Use role-based locator with aria-label
  const button = this.page.getByRole('button', { name: /create account/i })
  await expect(button).toBeEnabled()
  await button.click()
})

Then(
  'the account {string} should exist',
  async function (this: TickyTockWorld, accountName: string) {
    if (!this.page) throw new Error('Page not initialized')

    // Navigate to Settings
    const settingsLink = this.page.getByRole('link', { name: /settings/i })
    await expect(settingsLink).toBeVisible({ timeout: 5000 })
    await settingsLink.click()

    // Wait for Settings page to load
    await this.page.waitForURL(/.*#\/settings/, { timeout: 5000 })

    // Click the Switch button to lock the app (it shows a confirm dialog)
    const switchButton = this.page.getByRole('button', { name: /switch/i })
    await expect(switchButton).toBeVisible({ timeout: 5000 })

    // Accept the confirm dialog that appears when clicking Switch
    this.page.once('dialog', (dialog) => dialog.accept())
    await switchButton.click()

    // Wait for redirect to device accounts page
    await this.page.waitForURL(/.*#\/device-accounts/, { timeout: 5000 })

    // Verify account appears in the account list
    await expect(this.page.getByRole('button', { name: accountName })).toBeVisible({
      timeout: 5000,
    })
  }
)

Then(
  'I should see an error message about passphrase mismatch',
  async function (this: TickyTockWorld) {
    if (!this.page) throw new Error('Page not initialized')
    // Look for the invalid feedback text
    await expect(this.page.getByText(/passphrases don't match/i)).toBeVisible()
    // And the button should be disabled
    await expect(this.page.getByRole('button', { name: /create account/i })).toBeDisabled()
  }
)

Then('the submit button should be disabled', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await expect(this.page.getByRole('button', { name: /create account/i })).toBeDisabled()
})

Then('the submit button should be enabled', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  // The component allows short passphrases - button should be enabled
  const button = this.page.getByRole('button', { name: /create account/i })
  await expect(button).toBeEnabled()
})
