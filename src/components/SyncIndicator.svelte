<script lang="ts">
  import type { SyncInfo } from '@mrbelloc/encrypted-pouch'
  import {
    IconAlertTriangle,
    IconDownload,
    IconRefresh,
    IconUpload,
    IconCheck,
  } from '@tabler/icons-svelte'

  // Props
  let {
    syncEnabled = false,
    onSyncNow,
  }: {
    syncEnabled?: boolean
    onSyncNow?: () => void
  } = $props()

  // Animation queue state
  type IconState = 'idle' | 'push' | 'pull' | 'error' | 'ready' | 'syncing'
  let currentState = $state<IconState>('idle')
  let animationQueue = $state<IconState[]>([])
  let isAnimating = $state(false)

  /**
   * Process the next animation in the queue
   */
  function processQueue() {
    if (isAnimating || animationQueue.length === 0) return

    isAnimating = true
    const nextState = animationQueue.shift()!
    currentState = nextState

    // Animation duration: 600ms for icon switch, stay on error, reset others to idle
    if (nextState === 'error') {
      isAnimating = false
      // Stay on error, don't reset
    } else {
      setTimeout(() => {
        if (currentState !== 'error') {
          currentState = 'idle'
        }
        isAnimating = false
        processQueue() // Process next item in queue
      }, 800)
    }
  }

  /**
   * Handle sync event from EncryptedPouch
   */
  export function handleSync(info: SyncInfo) {
    // Clear syncing state if active
    if (currentState === 'syncing') {
      currentState = 'idle'
      animationQueue = []
      isAnimating = false
    }

    // Check for errors
    if (info.change.errors && info.change.errors.length > 0) {
      animationQueue.push('error')
      processQueue()
      return
    }

    // Check if any docs were actually synced
    const docsRead = info.change.docs_read || 0
    const docsWritten = info.change.docs_written || 0
    const hasChanges = docsRead > 0 || docsWritten > 0

    // If no changes, just show ready state (empty sync event)
    if (!hasChanges) {
      animationQueue.push('ready')
      processQueue()
      return
    }

    // Add animation based on actual document transfer
    // Only show push animation if docs were actually written
    if ((info.direction === 'push' || info.direction === 'both') && docsWritten > 0) {
      animationQueue.push('push')
    }
    // Only show pull animation if docs were actually read
    if ((info.direction === 'pull' || info.direction === 'both') && docsRead > 0) {
      animationQueue.push('pull')
    }

    // Always add "ready" state at the end to reset (if no error)
    animationQueue.push('ready')

    processQueue()
  }

  /**
   * Clear error state manually
   */
  export function clearError() {
    currentState = 'idle'
    animationQueue = []
    isAnimating = false
  }

  /**
   * Handle click on sync indicator
   */
  function handleClick() {
    if (currentState === 'error') {
      clearError()
    } else if (currentState === 'idle' && onSyncNow) {
      currentState = 'syncing'
      onSyncNow()
    }
  }
</script>

{#if syncEnabled}
  <div class="sync-indicator">
    <button
      type="button"
      class="switch-icon"
      class:active={currentState === 'push' || currentState === 'pull' || currentState === 'ready'}
      aria-label="Sync status"
      onclick={handleClick}
      disabled={currentState !== 'idle' && currentState !== 'error'}
      style="cursor: {currentState === 'idle' || currentState === 'error' ? 'pointer' : 'default'};"
    >
      <!-- Idle / Pull / Syncing (left icon) -->
      <span class="switch-icon-a" class:text-primary={currentState === 'pull'}>
        {#if currentState === 'error'}
          <IconAlertTriangle size={18} class="text-danger" />
        {:else if currentState === 'pull'}
          <IconDownload size={18} />
        {:else if currentState === 'syncing'}
          <IconRefresh size={18} class="spin-icon" />
        {:else}
          <IconRefresh size={18} />
        {/if}
      </span>

      <!-- Push / Ready (right icon) -->
      <span
        class="switch-icon-b"
        class:text-success={currentState === 'push' || currentState === 'ready'}
      >
        {#if currentState === 'ready'}
          <IconCheck size={18} />
        {:else}
          <IconUpload size={18} />
        {/if}
      </span>
    </button>

    {#if currentState === 'error'}
      <span class="text-danger small ms-2">Sync error - click to dismiss</span>
    {/if}
  </div>
{/if}

<style>
  .sync-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .switch-icon {
    border: none;
    background: transparent;
    padding: 0;
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .switch-icon:not(:disabled):hover {
    opacity: 0.7;
  }

  .switch-icon:disabled {
    cursor: not-allowed;
  }

  .switch-icon span {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  /* Left icon (idle/pull) */
  .switch-icon .switch-icon-a {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  /* Right icon (push/ready) - hidden by default */
  .switch-icon .switch-icon-b {
    opacity: 0;
    transform: translateX(-10px) scale(0.5);
  }

  /* Active state: hide left, show right */
  .switch-icon.active .switch-icon-a {
    opacity: 0;
    transform: translateX(10px) scale(0.5);
  }

  .switch-icon.active .switch-icon-b {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  /* Custom smooth spin animation */
  @keyframes smooth-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  :global(.spin-icon) {
    animation: smooth-spin 1s linear infinite;
  }
</style>
