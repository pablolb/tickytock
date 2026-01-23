<script lang="ts">
  import { getSettings } from '../lib/auth.svelte'
  import { updateTheme, resetTheme } from '../lib/themeStore.svelte'
  import { DEFAULT_THEME } from '../lib/settings'
  import type { ColorScheme, ThemeSettings } from '../lib/settings'
  import Offcanvas from './Offcanvas.svelte'

  let {
    show = $bindable(false),
  }: {
    show?: boolean
  } = $props()

  // Read theme directly from settings - component reacts to changes
  // Use getSettings() which returns null when locked (safe)
  let theme = $derived.by(() => {
    const settings = getSettings()
    const currentTheme = settings?.theme ?? DEFAULT_THEME
    return currentTheme
  })

  // Just handle clicks - no forms, no bind:group, just simple functions
  function handleClick(key: keyof ThemeSettings, value: any) {
    updateTheme({ [key]: value })
  }

  // Color scheme options with their colors
  const colorSchemes: { value: ColorScheme; color: string }[] = [
    { value: 'blue', color: '#066fd1' },
    { value: 'azure', color: '#4299e1' },
    { value: 'indigo', color: '#4263eb' },
    { value: 'purple', color: '#ae3ec9' },
    { value: 'pink', color: '#d6336c' },
    { value: 'red', color: '#d63939' },
    { value: 'orange', color: '#f76707' },
    { value: 'yellow', color: '#f59f00' },
    { value: 'lime', color: '#74b816' },
    { value: 'green', color: '#2fb344' },
    { value: 'teal', color: '#0ca678' },
    { value: 'cyan', color: '#17a2b8' },
  ]

  async function handleResetToDefaults() {
    await resetTheme()
  }

  function handleClose() {
    show = false
  }
</script>

<Offcanvas bind:show title="Theme Settings" position="end">
  <div class="offcanvas-body">
    <div>
      <!-- Color Mode -->
      <div class="mb-4">
        <div class="form-label mb-2">Color mode</div>
        <small class="text-secondary d-block mb-3">Choose the color mode for your app.</small>

        <div class="row g-2">
          <div class="col-6">
            <button
              type="button"
              class="form-selectgroup-item"
              class:active={theme.colorMode === 'light'}
              onclick={() => handleClick('colorMode', 'light')}
            >
              <span class="form-selectgroup-label">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-sun me-1"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"></path>
                  <path
                    d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"
                  ></path>
                </svg>
                Light
              </span>
            </button>
          </div>
          <div class="col-6">
            <button
              type="button"
              class="form-selectgroup-item"
              class:active={theme.colorMode === 'dark'}
              onclick={() => handleClick('colorMode', 'dark')}
            >
              <span class="form-selectgroup-label">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-moon me-1"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <path
                    d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
                  ></path>
                </svg>
                Dark
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Color Scheme -->
      <div class="mb-4">
        <div class="form-label mb-2">Color scheme</div>
        <small class="text-secondary d-block mb-3">The perfect color mode for your app.</small>

        <div class="row g-2">
          {#each colorSchemes as { value, color }}
            <div class="col-4">
              <button
                type="button"
                class="form-colorinput"
                class:active={theme.colorScheme === value}
                onclick={() => handleClick('colorScheme', value)}
              >
                <span class="form-colorinput-color" style="background-color: {color};">
                  {#if theme.colorScheme === value}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="color-checkmark"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  {/if}
                </span>
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Font Family -->
      <div class="mb-4">
        <div class="form-label mb-2">Font family</div>
        <small class="text-secondary d-block mb-3">Choose the font family that fits your app.</small
        >

        <div class="form-selectgroup form-selectgroup-boxes">
          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.fontFamily === 'sans-serif'}
            onclick={() => handleClick('fontFamily', 'sans-serif')}
          >
            <span class="form-selectgroup-label">Sans-serif</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.fontFamily === 'serif'}
            onclick={() => handleClick('fontFamily', 'serif')}
          >
            <span class="form-selectgroup-label" style="font-family: Georgia, serif;">Serif</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.fontFamily === 'monospace'}
            onclick={() => handleClick('fontFamily', 'monospace')}
          >
            <span class="form-selectgroup-label" style="font-family: monospace;">Monospace</span>
          </button>
        </div>
      </div>

      <!-- Theme Base -->
      <div class="mb-4">
        <div class="form-label mb-2">Theme base</div>
        <small class="text-secondary d-block mb-3">Choose the gray shade for your app.</small>

        <div class="form-selectgroup form-selectgroup-boxes">
          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.themeBase === 'slate'}
            onclick={() => handleClick('themeBase', 'slate')}
          >
            <span class="form-selectgroup-label">Slate</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.themeBase === 'gray'}
            onclick={() => handleClick('themeBase', 'gray')}
          >
            <span class="form-selectgroup-label">Gray</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.themeBase === 'zinc'}
            onclick={() => handleClick('themeBase', 'zinc')}
          >
            <span class="form-selectgroup-label">Zinc</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.themeBase === 'neutral'}
            onclick={() => handleClick('themeBase', 'neutral')}
          >
            <span class="form-selectgroup-label">Neutral</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.themeBase === 'stone'}
            onclick={() => handleClick('themeBase', 'stone')}
          >
            <span class="form-selectgroup-label">Stone</span>
          </button>
        </div>
      </div>

      <!-- Corner Radius -->
      <div class="mb-4">
        <div class="form-label mb-2">Corner Radius</div>
        <small class="text-secondary d-block mb-3"
          >Choose the border radius factor for your app.</small
        >

        <div class="form-selectgroup form-selectgroup-boxes">
          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.cornerRadius === '0'}
            onclick={() => handleClick('cornerRadius', '0')}
          >
            <span class="form-selectgroup-label">0</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.cornerRadius === '0.5'}
            onclick={() => handleClick('cornerRadius', '0.5')}
          >
            <span class="form-selectgroup-label">0.5</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.cornerRadius === '1'}
            onclick={() => handleClick('cornerRadius', '1')}
          >
            <span class="form-selectgroup-label">1</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.cornerRadius === '1.5'}
            onclick={() => handleClick('cornerRadius', '1.5')}
          >
            <span class="form-selectgroup-label">1.5</span>
          </button>

          <button
            type="button"
            class="form-selectgroup-item"
            class:active={theme.cornerRadius === '2'}
            onclick={() => handleClick('cornerRadius', '2')}
          >
            <span class="form-selectgroup-label">2</span>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-grid gap-2 mt-4">
        <button type="button" class="btn btn-secondary w-100" onclick={handleResetToDefaults}>
          Reset to defaults
        </button>
        <button type="button" class="btn btn-primary w-100" onclick={handleClose}>Close</button>
      </div>
    </div>
  </div>
</Offcanvas>

<style>
  /* Ensure proper touch targets */
  .form-selectgroup-label,
  .form-colorinput {
    min-height: 44px;
    min-width: 44px;
  }

  /* Color input styling */
  .form-colorinput {
    display: block;
    position: relative;
  }

  .form-colorinput-color {
    width: 100%;
    height: 2.5rem;
    border-radius: var(--tblr-border-radius);
    border: var(--tblr-border-width) solid var(--tblr-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    position: relative;
  }

  .color-checkmark {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }

  .form-colorinput.active .form-colorinput-color {
    box-shadow: 0 0 0 3px rgba(var(--tblr-primary-rgb), 0.25);
    border-color: var(--tblr-primary);
  }

  .form-colorinput {
    background: none;
    border: none;
    padding: 0;
  }

  /* Select group styling */
  .form-selectgroup {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-selectgroup-boxes .form-selectgroup-item {
    display: block;
  }

  .form-selectgroup-label {
    display: block;
    padding: 0.5rem 1rem;
    border: var(--tblr-border-width) solid var(--tblr-border-color);
    border-radius: var(--tblr-border-radius);
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    text-align: center;
  }

  .form-selectgroup-item {
    position: relative;
    background: none;
    border: none;
    padding: 0;
    width: 100%;
    text-align: left;
  }

  .form-selectgroup-item.active .form-selectgroup-label {
    background-color: var(--tblr-primary);
    color: #fff;
    border-color: var(--tblr-primary);
  }
</style>
