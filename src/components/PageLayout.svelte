<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
  }: {
    children?: Snippet
  } = $props()
</script>

<div class="page-body">
  <div class="container-xl">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  /* iPhone safe area support */
  .page-body {
    padding-top: max(1rem, env(safe-area-inset-top));
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
</style>
