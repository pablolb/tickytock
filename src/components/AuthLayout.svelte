<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
  }: {
    children?: Snippet
  } = $props()
</script>

<div class="page page-center">
  <div class="container container-tight py-4">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
