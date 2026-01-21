<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { unlock } from '../lib/auth.svelte'
  import { accountExists } from '../lib/accounts'
  import Button from './Button.svelte'
  import type { SyncInfo } from '@mrbelloc/encrypted-pouch'

  interface Props {
    params?: { username?: string }
    // eslint-disable-next-line no-unused-vars
    onSyncHandler?: (info: SyncInfo) => void

    onSyncConnected?: () => void
  }

  let { params, onSyncHandler, onSyncConnected }: Props = $props()

  let username = $derived(params?.username || '')
  let passphrase = $state('')
  let prevPassphraseLength = $state(0)
  let error = $state('')
  let loading = $state(false)

  // Redirect if account doesn't exist
  $effect(() => {
    if (username && !accountExists(username)) {
      push('/device-accounts')
    }
  })

  // Auto-submit when password manager fills in (0 -> >3 chars in one change)
  function handlePassphraseInput(e: Event) {
    const newValue = (e.target as HTMLInputElement).value
    const newLength = newValue.length

    if (prevPassphraseLength === 0 && newLength > 3) {
      // Password manager detected - auto-submit after a tick
      passphrase = newValue
      setTimeout(() => handleUnlock(), 0)
    }

    prevPassphraseLength = newLength
  }

  async function handleUnlock() {
    if (!passphrase.trim()) {
      error = 'Passphrase is required'
      return
    }

    loading = true
    error = ''

    try {
      await unlock(username, passphrase, undefined, onSyncHandler, onSyncConnected)
      // Auth state will change, App.svelte will handle redirect
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to unlock account'
      loading = false
    }
  }

  function handleBack() {
    push('/device-accounts')
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleUnlock()
    }
  }
</script>

<div class="page page-center">
  <div class="container container-tight py-4">
    <button class="btn btn-link mb-3" onclick={handleBack}>← Back</button>

    <div class="text-center mb-4">
      <h1 class="h2">Unlock Account</h1>
      <p class="text-secondary">Enter your passphrase to continue</p>
    </div>

    <form
      class="card card-md"
      onsubmit={(e) => {
        e.preventDefault()
        handleUnlock()
      }}
    >
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label" for="username">Username</label>
          <input
            id="username"
            type="text"
            class="form-control"
            value={username}
            disabled
            autocomplete="username"
          />
          <div class="form-text">For password manager autocomplete</div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="passphrase">Passphrase</label>
          <input
            id="passphrase"
            type="password"
            class="form-control"
            bind:value={passphrase}
            oninput={handlePassphraseInput}
            onkeydown={handleKeydown}
            placeholder="Enter your passphrase"
            autocomplete="current-password"
            autofocus
            disabled={loading}
          />
        </div>

        {#if error}
          <div class="alert alert-danger" role="alert">{error}</div>
        {/if}

        <Button variant="primary" size="lg" type="submit" disabled={loading || !passphrase.trim()}>
          {loading ? 'Unlocking...' : 'Unlock'}
        </Button>
      </div>
    </form>
  </div>
</div>

<style>
  /* Ensure button takes full width */
  form :global(.btn) {
    width: 100%;
  }
</style>
