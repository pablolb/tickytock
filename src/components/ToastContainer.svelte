<script lang="ts">
  import { getToastStore } from '../lib/toastStore.svelte'
  import { Toast } from 'bootstrap'

  const toastStore = getToastStore()

  function getColorForType(type: 'success' | 'error' | 'info') {
    switch (type) {
      case 'success':
        return 'text-success'
      case 'error':
        return 'text-danger'
      case 'info':
        return 'text-info'
    }
  }

  function initToast(element: HTMLElement) {
    const toast = new Toast(element, {
      autohide: true,
    })
    toast.show()
  }
</script>

<div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 9999;">
  {#each toastStore.toasts as toast (toast.id)}
    <div
      class="toast"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-bs-delay={toast.duration}
      use:initToast
    >
      <div class="toast-body d-flex align-items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="icon {getColorForType(toast.type)}"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          {#if toast.type === 'success'}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
            <path d="M9 12l2 2l4 -4" />
          {:else if toast.type === 'error'}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          {:else}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
            <path d="M12 9h.01" />
            <path d="M11 12h1v4h1" />
          {/if}
        </svg>
        <div class="flex-fill">{toast.message}</div>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="toast"
          aria-label="Close"
          onclick={() => toastStore.dismiss(toast.id)}
        ></button>
      </div>
    </div>
  {/each}
</div>
