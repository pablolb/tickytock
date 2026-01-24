import { Before, After, BeforeAll, AfterAll, Given, When, Then } from '@cucumber/cucumber'
import { TickyTockWorld } from '../support/world.js'
import { startDevServer, stopDevServer } from '../support/server.js'

BeforeAll({ timeout: 60000 }, async function () {
  await startDevServer()
})

AfterAll(function () {
  stopDevServer()
})

Before(async function (this: TickyTockWorld) {
  await this.init()
})

After(async function (this: TickyTockWorld) {
  await this.cleanup()
})

Given(
  'a user account {string} exists with passphrase {string}',
  async function (this: TickyTockWorld, username: string, passphrase: string) {
    if (!this.page) throw new Error('Page not initialized')

    this.testUsername = username
    this.testPassphrase = passphrase

    await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

    // Wait for e2eApi to be available (it's loaded asynchronously)
    await this.page.waitForFunction(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).e2eApi !== undefined
    })

    await this.page.evaluate(
      ({ username }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).e2eApi.createAccount(username)
      },
      { username }
    )

    await this.page.reload({ waitUntil: 'networkidle' })
  }
)

Given('I am on the unlock page', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.goto('http://localhost:5173')
})

When('I click on account {string}', async function (this: TickyTockWorld, accountName: string) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByRole('button', { name: accountName }).click()
})

When('I paste the passphrase {string}', async function (this: TickyTockWorld, passphrase: string) {
  if (!this.page) throw new Error('Page not initialized')

  const passphraseInput = this.page.locator('input[type="password"]').first()
  await passphraseInput.fill(passphrase)
})

When('I type the passphrase {string}', async function (this: TickyTockWorld, passphrase: string) {
  if (!this.page) throw new Error('Page not initialized')

  const passphraseInput = this.page.locator('input[type="password"]').first()
  await passphraseInput.type(passphrase, { delay: 100 })
})

When('I click the submit button', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')

  const submitButton = this.page.locator('button[type="submit"]').first()
  await submitButton.click()
})

Then('the app auto-logins and I should see the main app', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByRole('heading', { name: /start activity/i }).waitFor()
})

Then('I should see the main app', async function (this: TickyTockWorld) {
  if (!this.page) throw new Error('Page not initialized')
  await this.page.getByRole('heading', { name: /start activity/i }).waitFor()
})
