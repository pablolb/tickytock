<script lang="ts">
  import Router, { location, push } from 'svelte-spa-router'
  import MainView from './components/MainView.svelte'
  import ActivitiesView from './components/ActivitiesView.svelte'
  import StatsView from './components/StatsView.svelte'
  import SettingsView from './components/SettingsView.svelte'
  import DeviceAccountsView from './components/DeviceAccountsView.svelte'
  import UnlockView from './components/UnlockView.svelte'
  import CreateAccountView from './components/CreateAccountView.svelte'
  import { getAppState } from './lib/auth.svelte'
  import { IconClock, IconList, IconChartBar, IconSettings } from '@tabler/icons-svelte'
  import ThemeSettings from './components/ThemeSettings.svelte'
  import ToastContainer from './components/ToastContainer.svelte'
  import type { SyncInfo } from '@mrbelloc/encrypted-pouch'

  // Theme settings state
  let showThemeSettings = $state(false)

  // Reference to MainView for sync callbacks
  let mainViewRef: MainView | undefined = $state()

  // Global sync handler that forwards to MainView
  function handleGlobalSync(info: SyncInfo) {
    mainViewRef?.handleSync(info)
  }

  // Global sync connected handler that notifies MainView
  function handleSyncConnected() {
    mainViewRef?.setSyncConnected(true)
  }

  const routes = {
    '/activities': ActivitiesView,
    '/stats': StatsView,
    '/settings': SettingsView,
    '/device-accounts': DeviceAccountsView,
    '/unlock/:username': UnlockView,
    '/create-account': CreateAccountView,
  }

  // Reactive auth state
  let appState = $derived(getAppState())

  // Derived state to check current route
  let isTrackActive = $derived($location === '/')
  let isActivitiesActive = $derived($location === '/activities')
  let isStatsActive = $derived($location === '/stats')
  let isSettingsActive = $derived($location === '/settings')

  // Auth pages (no nav bar shown)
  let isAuthPage = $derived(
    $location === '/device-accounts' ||
      $location.startsWith('/unlock/') ||
      $location === '/create-account'
  )

  // Auth flow redirects
  $effect(() => {
    // Redirect to device accounts if locked and not on auth page
    if (appState.status === 'locked' && !isAuthPage) {
      push('/device-accounts')
    }
    // Redirect to main app if unlocked but on auth page
    if (appState.status === 'unlocked' && isAuthPage) {
      push('/')
    }
  })

  // TEMPORARILY DISABLED - Testing if freeze is in Fireproof, not our reactive loop
  // Track current sync mode to detect actual changes (prevent infinite loop)
  // let currentSyncMode = $state<string>('')
  // let isConnecting = $state(false)

  // Reactive sync connection - watch for settings changes
  // $effect(() => {
  //   if (appState.status === 'unlocked') {
  //     const settings = appState.dataStore.settings
  //     const newSyncMode = settings.syncMode

  //     // Only react if syncMode actually changed AND we're not already connecting
  //     if (newSyncMode !== currentSyncMode && !isConnecting) {
  //       console.log('[App Effect] Sync mode changed:', currentSyncMode, '→', newSyncMode)
  //       currentSyncMode = newSyncMode

  //       // Get session credentials
  //       const credentials = getSessionCredentials()

  //       // Only react to changes if we have credentials (after initial unlock)
  //       if (credentials) {
  //         const syncConfig = getActiveSyncConfig(settings)

  //         if (syncConfig) {
  //           console.log('[App Effect] Sync config detected, connecting...')
  //           isConnecting = true
  //           // Disconnect current sync first
  //           appState.dataStore.disconnectRemote()
  //           // Reconnect with new settings
  //           connectToSync(appState.dataStore, credentials.username, credentials.password)
  //             .catch((error) => {
  //               console.error('[App Effect] Failed to connect sync:', error)
  //             })
  //             .finally(() => {
  //               isConnecting = false
  //             })
  //         } else {
  //           console.log('[App Effect] Sync disabled, disconnecting...')
  //           appState.dataStore.disconnectRemote()
  //         }
  //       }
  //     }
  //   }
  // })
</script>

{#if isAuthPage}
  <!-- Auth pages have their own page structure -->
  {#if $location.startsWith('/unlock/')}
    <UnlockView
      params={{ username: $location.split('/')[2] }}
      onSyncHandler={handleGlobalSync}
      onSyncConnected={handleSyncConnected}
    />
  {:else}
    <Router {routes} />
  {/if}
{:else}
  <!-- Authenticated app with navbar -->
  <div class="page">
    <!-- Mobile Bottom Navigation -->
    <nav class="navbar navbar-light fixed-bottom d-md-none border-top">
      <div class="container-xl d-flex justify-content-around">
        <a href="#/" class="nav-link text-center" class:active={isTrackActive}>
          <IconClock size={24} />
          <div class="small">Track</div>
        </a>
        <a href="#/activities" class="nav-link text-center" class:active={isActivitiesActive}>
          <IconList size={24} />
          <div class="small">Activities</div>
        </a>
        <a href="#/stats" class="nav-link text-center" class:active={isStatsActive}>
          <IconChartBar size={24} />
          <div class="small">Stats</div>
        </a>
        <a href="#/settings" class="nav-link text-center" class:active={isSettingsActive}>
          <IconSettings size={24} />
          <div class="small">Settings</div>
        </a>
      </div>
    </nav>

    <!-- Desktop Header -->
    <header class="navbar navbar-expand-md navbar-light d-none d-md-flex sticky-top">
      <div class="container-xl">
        <h1 class="navbar-brand">TickyTock</h1>
        <div class="navbar-nav flex-row">
          <div class="nav-item">
            <a href="#/" class="nav-link" class:active={isTrackActive}>
              <IconClock class="me-1" />
              Track
            </a>
          </div>
          <div class="nav-item">
            <a href="#/activities" class="nav-link" class:active={isActivitiesActive}>
              <IconList class="me-1" />
              Activities
            </a>
          </div>
          <div class="nav-item">
            <a href="#/stats" class="nav-link" class:active={isStatsActive}>
              <IconChartBar class="me-1" />
              Stats
            </a>
          </div>
          <div class="nav-item">
            <a href="#/settings" class="nav-link" class:active={isSettingsActive}>
              <IconSettings class="me-1" />
              Settings
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <div class="page-wrapper">
      {#if $location === '/'}
        <MainView bind:this={mainViewRef} />
      {:else}
        <Router {routes} />
      {/if}
    </div>

    <!-- Theme Settings Offcanvas -->
    <ThemeSettings bind:show={showThemeSettings} />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
{/if}

<style>
  .page {
    padding-bottom: calc(60px + var(--safe-area-bottom));
  }

  @media (min-width: 768px) {
    .page {
      padding-bottom: 0;
    }
  }

  /* Mobile bottom nav adjustments for safe areas */
  .fixed-bottom {
    padding-top: 0.25rem;
    padding-bottom: max(0.25rem, var(--safe-area-bottom));
    padding-left: calc(0.5rem + var(--safe-area-left));
    padding-right: calc(0.5rem + var(--safe-area-right));
  }

  .fixed-bottom .nav-link {
    min-height: 44px; /* iOS touch target */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.125rem;
    padding: 0.25rem 0.5rem;
  }

  .fixed-bottom .nav-link.active {
    color: var(--tblr-primary) !important;
  }

  /* Desktop header safe area */
  .sticky-top {
    padding-top: calc(0.5rem + var(--safe-area-top));
  }
</style>
