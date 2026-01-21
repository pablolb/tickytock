<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    show = $bindable(false),
    title,
    position = 'end',
    children,
  }: {
    show?: boolean
    title: string
    position?: 'start' | 'end' | 'top' | 'bottom'
    children?: Snippet
  } = $props()

  function handleClose() {
    show = false
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }
</script>

<!-- Backdrop -->
{#if show}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="offcanvas-backdrop fade show" onclick={handleBackdropClick}></div>
{/if}

<!-- Offcanvas -->
<div
  class="offcanvas offcanvas-{position}"
  class:show
  tabindex="-1"
  role="dialog"
  aria-modal="true"
>
  <div class="offcanvas-header">
    <h2 class="offcanvas-title">{title}</h2>
    <button type="button" class="btn-close" aria-label="Close" onclick={handleClose}></button>
  </div>

  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  /* Ensure offcanvas appears above everything */
  .offcanvas {
    z-index: 1045;
  }

  .offcanvas-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1040;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .offcanvas-backdrop.fade {
    opacity: 0;
    transition: opacity 0.15s linear;
  }

  .offcanvas-backdrop.show {
    opacity: 1;
  }

  /* Mobile-friendly width */
  @media (max-width: 576px) {
    .offcanvas.offcanvas-end,
    .offcanvas.offcanvas-start {
      width: 85vw;
      max-width: 400px;
    }
  }

  /* Ensure proper touch target for close button */
  .btn-close {
    min-width: 44px;
    min-height: 44px;
  }

  .offcanvas-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
</style>
