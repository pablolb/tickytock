<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { getSettings } from '../lib/auth.svelte'
  import { getActiveSyncConfig } from '../lib/settings'

  let syncStatus = $state<'synced' | 'syncing' | 'offline' | 'disabled'>('offline')
  let lastSyncTime = $state<number | null>(null)

  // Get settings reactively
  const settings = $derived(getSettings())
  const syncConfig = $derived(settings ? getActiveSyncConfig(settings) : null)
  const syncEnabled = $derived(syncConfig !== null)
  const isDev = import.meta.env.DEV

  // Simple ping to check connectivity
  async function checkSyncStatus() {
    if (!syncEnabled) {
      syncStatus = 'disabled'
      return
    }

    // In dev mode, assume synced if PartyKit is running
    // (no good health endpoint to check)
    if (isDev) {
      syncStatus = 'synced'
      lastSyncTime = Date.now()
      return
    }

    try {
      // Production: check Netlify
      const host = 'https://tickytock.netlify.app'

      await fetch(host, {
        method: 'HEAD',
        mode: 'no-cors',
      })
      syncStatus = 'synced'
      lastSyncTime = Date.now()
    } catch {
      syncStatus = 'offline'
    }
  }

  let interval: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    checkSyncStatus()
    interval = setInterval(checkSyncStatus, 30000) // Check every 30s
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
  })

  function getStatusText() {
    switch (syncStatus) {
      case 'synced':
        return lastSyncTime ? `Synced ${formatTime(lastSyncTime)}` : 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'offline':
        return 'Offline'
      case 'disabled':
        return 'Sync disabled'
    }
  }

  function getStatusClass() {
    switch (syncStatus) {
      case 'synced':
        return 'bg-success'
      case 'syncing':
        return 'bg-warning'
      case 'offline':
        return 'bg-danger'
      case 'disabled':
        return 'bg-secondary'
    }
  }

  function formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)

    if (seconds < 60) return 'just now'
    if (minutes === 1) return '1 min ago'
    if (minutes < 60) return `${minutes} mins ago`
    return new Date(timestamp).toLocaleTimeString()
  }
</script>

<span class="badge {getStatusClass()}" class:syncing={syncStatus === 'syncing'}>
  <span class="status-dot"></span>
  {getStatusText()}
</span>

<style>
  /* Badge positioning for inline dot */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    padding: 0.375rem 0.625rem;
  }

  /* Status dot */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
  }

  /* Pulse animation for syncing state */
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 0.3;
    }
  }

  .badge.syncing .status-dot {
    animation: pulse 1.5s ease-in-out infinite;
  }
</style>
