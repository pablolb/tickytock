<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { createAccountAndUnlock } from '../lib/auth.svelte'
  import Button from './Button.svelte'
  import { IconAlertTriangle } from '@tabler/icons-svelte'

  let username = $state('')
  let passphrase = $state('')
  let passphraseConfirm = $state('')
  let error = $state('')
  let loading = $state(false)

  let passphraseMatch = $derived(passphrase === passphraseConfirm)
  let canSubmit = $derived(
    username.trim().length > 0 &&
      passphrase.length > 0 &&
      passphraseConfirm.length > 0 &&
      passphraseMatch
  )

  async function handleCreate() {
    if (!canSubmit) return

    loading = true
    error = ''

    try {
      await createAccountAndUnlock(username.trim(), passphrase)
      // Auth state will change, App.svelte will handle redirect
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create account'
      loading = false
    }
  }

  function handleBack() {
    push('/device-accounts')
  }
</script>

<div class="page page-center">
  <div class="container container-tight py-4">
    <button class="btn btn-link mb-3" onclick={handleBack}>← Back</button>

    <div class="text-center mb-4">
      <h1 class="h2">Create Account</h1>
      <p class="text-secondary">Choose a username and passphrase</p>
    </div>

    <form
      class="card card-md"
      onsubmit={(e) => {
        e.preventDefault()
        handleCreate()
      }}
    >
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label" for="username">Username</label>
          <input
            id="username"
            type="text"
            class="form-control"
            bind:value={username}
            placeholder="Enter username"
            autocomplete="username"
            autofocus
            disabled={loading}
          />
          <div class="form-text">Letters, numbers, hyphens, and underscores only</div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="passphrase">Passphrase</label>
          <input
            id="passphrase"
            type="password"
            class="form-control"
            bind:value={passphrase}
            placeholder="Enter passphrase"
            autocomplete="new-password"
            disabled={loading}
          />
          <div class="form-text">Choose a strong passphrase you can remember</div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="passphrase-confirm">Confirm Passphrase</label>
          <input
            id="passphrase-confirm"
            type="password"
            class="form-control"
            class:is-valid={passphraseConfirm.length > 0 && passphraseMatch}
            class:is-invalid={passphraseConfirm.length > 0 && !passphraseMatch}
            bind:value={passphraseConfirm}
            placeholder="Re-enter passphrase"
            autocomplete="new-password"
            disabled={loading}
          />
          {#if passphraseConfirm.length > 0}
            {#if passphraseMatch}
              <div class="valid-feedback">Passphrases match</div>
            {:else}
              <div class="invalid-feedback">Passphrases don't match</div>
            {/if}
          {/if}
        </div>

        {#if error}
          <div class="alert alert-danger" role="alert">{error}</div>
        {/if}

        <div class="alert alert-warning" role="alert">
          <div class="alert-icon">
            <IconAlertTriangle />
          </div>
          <div>
            <h4 class="alert-title">Important</h4>
            <div class="text-secondary">
              Your passphrase encrypts all your data. If you forget it, there is no way to recover
              your data.
            </div>
          </div>
        </div>

        <Button variant="primary" size="lg" type="submit" disabled={loading || !canSubmit}>
          {loading ? 'Creating Account...' : 'Create Account'}
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

  /* Show validation feedback */
  .is-valid ~ .valid-feedback,
  .is-invalid ~ .invalid-feedback {
    display: block;
  }
</style>
