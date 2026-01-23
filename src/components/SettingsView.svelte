<script lang="ts">
  import { getActivityStore } from '../lib/activityStore.svelte'
  import {
    getSettings,
    updateSettings,
    getCurrentUsername,
    lock,
    getAppState,
  } from '../lib/auth.svelte'
  import { deleteAccount } from '../lib/accounts'
  import type { SyncMode } from '../lib/settings'
  import { getLocalDateString } from '../lib/dateUtils'
  import { getToastStore } from '../lib/toastStore.svelte'
  import PageLayout from './PageLayout.svelte'
  import {
    IconAlertCircle,
    IconAlertTriangle,
    IconCheck,
    IconClock,
    IconDatabase,
    IconDownload,
    IconPalette,
    IconRefresh,
    IconSwitchHorizontal,
    IconTrash,
    IconTrashX,
    IconUpload,
    IconUser,
  } from '@tabler/icons-svelte'
  import ThemeSettings from './ThemeSettings.svelte'

  const toastStore = getToastStore()

  // Theme settings state
  let showThemeSettings = $state(false)

  const store = getActivityStore()
  const settings = $derived(getSettings())
  const username = $derived(getCurrentUsername())
  const appState = $derived(getAppState())

  // Sync settings state
  let syncMode = $state<SyncMode>('disabled')
  let couchdbUrl = $state('')
  let couchdbLive = $state(true)
  let couchdbRetry = $state(true)
  let showCouchDBSettings = $state(false)

  // Validation
  let urlError = $state('')

  // Track if initialized
  let initialized = $state(false)

  // Initialize from current settings (only once)
  $effect(() => {
    if (settings && username && !initialized) {
      initialized = true
      syncMode = settings.syncMode
      showCouchDBSettings = syncMode === 'couchdb'

      if (settings.couchdb) {
        couchdbUrl = settings.couchdb.url
        couchdbLive = settings.couchdb.live ?? true
        couchdbRetry = settings.couchdb.retry ?? true
      }
    }
  })

  function validateUrl(url: string): boolean {
    if (!url.trim()) {
      urlError = 'URL is required'
      return false
    }
    try {
      new URL(url)
      urlError = ''
      return true
    } catch {
      urlError = 'Invalid URL format'
      return false
    }
  }

  async function handleSyncModeChange(mode: SyncMode) {
    syncMode = mode
    showCouchDBSettings = mode === 'couchdb'

    if (mode === 'disabled') {
      await updateSettings({ syncMode: mode })

      // Disconnect sync immediately
      if (appState.status === 'unlocked') {
        appState.dataStore.disconnectRemote()
      }

      toastStore.info('Sync disabled. All data stays local.')
    }
  }

  async function handleSaveCouchDB() {
    if (syncMode !== 'couchdb') return

    if (!validateUrl(couchdbUrl)) return

    try {
      // Save settings
      await updateSettings({
        syncMode: 'couchdb',
        couchdb: {
          url: couchdbUrl.trim(),
          live: couchdbLive,
          retry: couchdbRetry,
        },
      })

      // Restart sync immediately
      if (appState.status === 'unlocked') {
        const dataStore = appState.dataStore

        // Disconnect current sync
        dataStore.disconnectRemote()

        // Reconnect with new settings
        await dataStore.connectRemote({
          url: couchdbUrl.trim(),
          live: couchdbLive,
          retry: couchdbRetry,
        })

        toastStore.success('CouchDB sync settings saved and sync restarted!')
      } else {
        toastStore.success('CouchDB sync settings saved!')
      }
    } catch (error) {
      console.error('Failed to save CouchDB settings:', error)
      toastStore.error('Failed to save settings. Please try again.')
    }
  }

  async function handleToggleAutoStop() {
    if (!settings) return
    await updateSettings({
      autoStopRunning: !settings.autoStopRunning,
    })
  }

  function handleExport() {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        username: username,
        activities: store.activities.map((a) => ({
          task: a.task,
          tags: a.tags,
          from: a.from,
          to: a.to,
        })),
      }

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `tickytock-${username}-${getLocalDateString(new Date())}.json`
      a.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      toastStore.error('Failed to export activities')
    }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!Array.isArray(data.activities)) {
          throw new Error('Invalid JSON format')
        }

        const count = data.activities.length
        if (!confirm(`Import ${count} activities?`)) return

        let imported = 0
        for (const activity of data.activities) {
          try {
            await store.createActivity({
              task: activity.task,
              tags: activity.tags || [],
              from: activity.from,
              to: activity.to ?? null,
            })
            imported++
          } catch (error) {
            console.error('Failed to import activity:', error)
          }
        }

        toastStore.success(`Successfully imported ${imported} of ${count} activities`)
      } catch (error) {
        console.error('Import error:', error)
        toastStore.error('Failed to import. Please check the file format.')
      }
    }

    input.click()
  }

  function handleSwitchAccount() {
    if (confirm('Switch to a different account?')) {
      lock()
    }
  }

  async function handleDeleteLocalData() {
    if (!username) return

    const confirmMessage = `⚠️ DELETE LOCAL DATA\n\nThis will permanently delete all activities and settings on this device.\n\nType "${username}" to confirm:`

    const confirmation = prompt(confirmMessage)

    if (confirmation !== username) {
      if (confirmation !== null) {
        toastStore.info('Deletion cancelled.')
      }
      return
    }

    try {
      if (appState.status === 'unlocked') {
        // Delete all local data via dataStore
        await appState.dataStore.deleteAllLocal()
      }

      // Delete the account from localStorage
      await deleteAccount(username)

      // Lock the app
      lock()

      toastStore.success('Local data deleted successfully.')
    } catch (error) {
      console.error('Failed to delete local data:', error)
      toastStore.error('Failed to delete local data. Please try again.')
    }
  }

  async function handleDeleteLocalAndRemoteData() {
    if (!username) return

    const confirmMessage = `🚨 DELETE LOCAL & REMOTE DATA\n\nThis will permanently delete ALL data on this device AND the remote server.\n\nTHIS CANNOT BE UNDONE!\n\nType "${username}" to confirm:`

    const confirmation = prompt(confirmMessage)

    if (confirmation !== username) {
      if (confirmation !== null) {
        toastStore.info('Deletion cancelled.')
      }
      return
    }

    try {
      if (appState.status === 'unlocked') {
        // Check if sync is enabled
        if (settings?.syncMode !== 'couchdb' || !settings?.couchdb?.url) {
          toastStore.error('Sync is not enabled. Use "Delete Local Data" instead.')
          return
        }

        // Delete all local AND remote data via dataStore
        await appState.dataStore.deleteAllAndSync()
      }

      // Delete the account from localStorage
      await deleteAccount(username)

      // Lock the app
      lock()

      toastStore.success('All data deleted successfully.')
    } catch (error) {
      console.error('Failed to delete data:', error)
      toastStore.error('Failed to delete data. Please try again.')
    }
  }
</script>

<PageLayout>
  <!-- Page Header -->
  <div class="page-header">
    <div class="row align-items-center">
      <div class="col">
        <h2 class="page-title">Settings</h2>
      </div>
    </div>
  </div>

  {#if settings}
    <!-- Theme Settings -->
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">
          <IconPalette class="me-2" />
          Theme Settings
        </h3>
      </div>
      <div class="list-group list-group-flush">
        <div class="list-group-item">
          <div class="row align-items-center">
            <div class="col">
              <div class="fw-medium">Customize appearance</div>
              <div class="text-secondary small">Change color mode, scheme, fonts, and more</div>
            </div>
            <div class="col-auto">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onclick={() => (showThemeSettings = true)}
              >
                <IconPalette size={18} class="me-1" />
                Open Theme Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Tracking -->
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">
          <IconClock class="me-2" />
          Activity Tracking
        </h3>
      </div>
      <div class="card-body">
        <label class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            checked={settings.autoStopRunning}
            onchange={handleToggleAutoStop}
          />
          <span class="form-check-label">
            <div>Auto-stop running activities</div>
            <div class="text-secondary small">
              Automatically stop the current activity when starting a new one
            </div>
          </span>
        </label>
      </div>
    </div>

    <!-- Sync & Storage -->
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">
          <IconRefresh class="me-2" />
          Sync
        </h3>
      </div>
      <div class="card-body">
        <!-- Sync Mode Options -->
        <div class="mb-3">
          <div class="form-label">Sync Mode</div>

          <!-- Disabled Option -->
          <label class="form-check mb-3">
            <input
              class="form-check-input"
              type="radio"
              name="syncMode"
              value="disabled"
              checked={syncMode === 'disabled'}
              onchange={() => handleSyncModeChange('disabled')}
            />
            <span class="form-check-label">
              <strong>Disabled</strong>
              <div class="text-secondary small">All data stays local on this device</div>
            </span>
          </label>

          <!-- CouchDB Option -->
          <label class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="syncMode"
              value="couchdb"
              checked={syncMode === 'couchdb'}
              onchange={() => handleSyncModeChange('couchdb')}
            />
            <span class="form-check-label">
              <strong>CouchDB Sync</strong>
              <div class="text-secondary small">Sync with your own CouchDB server</div>
            </span>
          </label>
        </div>

        <!-- CouchDB Settings Form -->
        {#if showCouchDBSettings}
          <div class="border-top pt-3 mt-3">
            <div class="mb-3">
              <label class="form-label" for="couchdb-url"> Your CouchDB server endpoint </label>
              <input
                id="couchdb-url"
                type="url"
                class="form-control"
                class:is-invalid={urlError}
                bind:value={couchdbUrl}
                onblur={() => validateUrl(couchdbUrl)}
                placeholder="http://localhost:5984/mydb"
              />
              {#if urlError}
                <div class="invalid-feedback">{urlError}</div>
              {/if}
              <small class="form-hint">
                Include credentials if needed: http://user:pass@localhost:5984/mydb
              </small>
            </div>

            <div class="mb-3">
              <fieldset>
                <legend class="form-label">Sync Options</legend>
                <div>
                  <label class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" bind:checked={couchdbLive} />
                    <span class="form-check-label">
                      Live sync
                      <span class="form-check-description">Real-time updates</span>
                    </span>
                  </label>
                  <label class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" bind:checked={couchdbRetry} />
                    <span class="form-check-label">
                      Auto-retry
                      <span class="form-check-description">Retry on connection failure</span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>

            <button type="button" class="btn btn-primary" onclick={handleSaveCouchDB}>
              <IconCheck size={18} class="me-1" />
              Save CouchDB Settings
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Data Management -->
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">
          <IconDatabase class="me-2" />
          Data Management
        </h3>
      </div>
      <div class="list-group list-group-flush">
        <div class="list-group-item">
          <div class="row align-items-center">
            <div class="col">
              <div class="fw-medium">Export activities</div>
              <div class="text-secondary small">Download all activities as JSON</div>
            </div>
            <div class="col-auto">
              <button type="button" class="btn btn-secondary btn-sm" onclick={handleExport}>
                <IconDownload size={18} class="me-1" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div class="list-group-item">
          <div class="row align-items-center">
            <div class="col">
              <div class="fw-medium">Import activities</div>
              <div class="text-secondary small">Import activities from JSON file</div>
            </div>
            <div class="col-auto">
              <button type="button" class="btn btn-secondary btn-sm" onclick={handleImport}>
                <IconUpload size={18} class="me-1" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Account -->
    <div class="card mb-3">
      <div class="card-header">
        <h3 class="card-title">
          <IconUser class="me-2" />
          Account
        </h3>
      </div>
      <div class="list-group list-group-flush">
        <div class="list-group-item">
          <div class="row align-items-center">
            <div class="col">
              <div class="fw-medium">Signed in as</div>
              <div class="text-primary">{username}</div>
            </div>
          </div>
        </div>
        <div class="list-group-item">
          <div class="row align-items-center">
            <div class="col">
              <div class="fw-medium">Switch account</div>
              <div class="text-secondary small">Lock current account and switch</div>
            </div>
            <div class="col-auto">
              <button type="button" class="btn btn-secondary btn-sm" onclick={handleSwitchAccount}>
                <IconSwitchHorizontal size={18} class="me-1" />
                Switch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card mb-3">
      <div class="card-status-top bg-danger"></div>
      <div class="card-header">
        <h3 class="card-title">
          <IconAlertTriangle class="me-2 text-danger" />
          Danger Zone
        </h3>
      </div>
      <div class="card-body">
        <div class="alert alert-danger" role="alert">
          <div class="d-flex">
            <div>
              <IconAlertCircle class="icon alert-icon" />
            </div>
            <div>
              <h4 class="alert-title">Warning</h4>
              <div class="text-secondary">These actions are permanent and cannot be undone.</div>
            </div>
          </div>
        </div>

        <div class="mb-3 pb-3 border-bottom">
          <div class="mb-2">
            <strong>Delete Local Data</strong>
          </div>
          <p class="text-secondary mb-3">
            Permanently delete all activities and settings on this device. Your account will be
            removed from this device. If sync is enabled, remote data will NOT be affected.
          </p>
          <button type="button" class="btn btn-danger btn-sm" onclick={handleDeleteLocalData}>
            <IconTrash size={18} class="me-1" />
            Delete Local Data
          </button>
        </div>

        {#if settings?.syncMode === 'couchdb' && settings?.couchdb?.url}
          <div>
            <div class="mb-2">
              <strong>Delete Local & Remote Data</strong>
            </div>
            <p class="text-secondary mb-3">
              Permanently delete all activities and settings from this device AND the remote CouchDB
              server. This will affect all synced devices. THIS CANNOT BE UNDONE.
            </p>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              onclick={handleDeleteLocalAndRemoteData}
            >
              <IconTrashX size={18} class="me-1" />
              Delete Local & Remote Data
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Theme Settings Offcanvas -->
  <ThemeSettings bind:show={showThemeSettings} />
</PageLayout>
