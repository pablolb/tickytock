import { setWorldConstructor, World } from '@cucumber/cucumber'
import type { IWorldOptions } from '@cucumber/cucumber'
import { chromium, expect } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

// Configure global Playwright expect timeout for all assertions
expect.configure({ timeout: 30000 })

export interface E2EApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storeActivities(activities: any[]): Promise<void>
  clearActivities(): Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActivities(): any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCurrentActivity(): any | undefined
}

export class TickyTockWorld extends World {
  browser?: Browser
  context?: BrowserContext
  page?: Page
  testUsername?: string
  testPassphrase?: string

  constructor(options: IWorldOptions) {
    super(options)
  }

  async init() {
    const isHeaded = process.env.HEADED === 'true'

    this.browser = await chromium.launch({
      headless: !isHeaded,
      slowMo: isHeaded ? 100 : 0, // Slow down in headed mode to see actions
      executablePath: '/usr/bin/chromium',
    })

    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()

    // Set default timeout for all Playwright actions (clicks, waits, expects, etc.)
    // This eliminates the need to specify { timeout: 5000 } everywhere
    // Default is 30s for most operations, can be overridden per-action if needed
    this.page.setDefaultTimeout(30000) // 30 seconds for actions and waits
    this.page.setDefaultNavigationTimeout(30000) // 30 seconds for navigation
  }

  async cleanup() {
    await this.page?.close()
    await this.context?.close()
    await this.browser?.close()
  }

  async getE2EApi(): Promise<E2EApi> {
    if (!this.page) throw new Error('Page not initialized')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.page.evaluate(() => (window as any).e2eApi)
  }
}

setWorldConstructor(TickyTockWorld)
