<script lang="ts">
  import { getAccounts } from '../lib/accounts'
  import { push } from 'svelte-spa-router'
  import { IconHourglassEmpty, IconBrandGithub } from '@tabler/icons-svelte'
  import AuthLayout from './AuthLayout.svelte'

  let accounts = $state(getAccounts())

  // Build info from Vite
  const buildDate = new Date(__BUILD_DATE__).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  function handleSelectAccount(username: string) {
    push(`/unlock/${username}`)
  }

  function handleCreateAccount() {
    push('/create-account')
  }
</script>

<AuthLayout>
  <div class="text-center mb-4">
    <h1 class="display-4">
      <IconHourglassEmpty size={80} class="text-pink" />
      TickyTock
    </h1>
  </div>

  {#if accounts.length > 0}
    <div class="card card-md">
      <div class="card-header">
        <h3 class="card-title text-uppercase fs-6 fw-medium text-secondary">Your Accounts</h3>
      </div>
      <div class="list-group list-group-flush">
        {#each accounts as account (account.username)}
          <button
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            onclick={() => handleSelectAccount(account.username)}
          >
            <div class="text-start">
              <div class="fw-bold fs-5 mb-1">{account.username}</div>
              <div class="text-secondary small">
                Last used: {new Date(account.lastUsedAt).toLocaleDateString()}
              </div>
            </div>
            <div class="text-primary fs-4">→</div>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="card card-md">
      <div class="card-body text-center py-5">
        <p class="text-secondary mb-2">No accounts on this device</p>
        <small class="text-muted">Create an account to get started</small>
      </div>
    </div>
  {/if}

  <div class="mt-4 pt-3 border-top">
    <button
      type="button"
      class="btn btn-primary btn-lg w-100"
      onclick={handleCreateAccount}
      aria-label="create account"
    >
      + Create New Account
    </button>
  </div>

  <div class="text-center mt-4">
    <a
      href="https://github.com/pablolb/tickytock"
      target="_blank"
      rel="noopener noreferrer"
      class="text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
    >
      <IconBrandGithub size={20} />
      <span>View on GitHub</span>
    </a>
  </div>

  <div class="text-center mt-2">
    <small class="text-muted">Built {buildDate}</small>
  </div>
</AuthLayout>

<style>
  /* Arrow transition on hover */
  .list-group-item:hover .text-primary {
    transform: translateX(4px);
    transition: transform 0.2s;
  }

  /* Ensure button fills width */
  .list-group-item-action {
    min-height: 80px;
  }

  /* Full width button */
  .mt-4 :global(button) {
    width: 100%;
  }
</style>
