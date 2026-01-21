<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'primary',
    size = 'medium',
    outline = false,
    disabled = false,
    type = 'button',
    onclick,
    class: className = '',
    children,
  }: {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
    size?: 'sm' | 'medium' | 'lg'
    outline?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    // eslint-disable-next-line no-unused-vars
    onclick?: (event: MouseEvent) => void
    class?: string
    children?: Snippet
  } = $props()

  // Map size prop to Tabler classes
  const sizeClass = $derived(size === 'medium' ? '' : `btn-${size}`)

  // Map variant to Tabler classes
  const variantClass = $derived(outline ? `btn-outline-${variant}` : `btn-${variant}`)
</script>

<button {type} {disabled} {onclick} class="btn {variantClass} {sizeClass} {className}">
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  /* Override Tabler defaults for iOS touch targets */
  .btn {
    min-height: 44px;
  }

  .btn-sm {
    min-height: 44px;
  }
</style>
