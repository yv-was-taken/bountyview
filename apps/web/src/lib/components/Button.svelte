<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    children: Snippet;
  }

  let { variant = 'primary', loading = false, children, ...rest }: Props = $props();

  const base = 'font-mono text-sm font-medium border-2 border-ink px-4 py-2 transition-all duration-150 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand text-white hover:border-4 hover:-m-[2px] active:translate-y-px',
    secondary: 'bg-surface text-ink hover:bg-bg active:translate-y-px',
    danger: 'bg-danger text-white hover:border-4 hover:-m-[2px] active:translate-y-px',
    ghost: 'border-transparent bg-transparent text-ink hover:border-ink'
  };
</script>

<button class="{base} {variants[variant]}" disabled={loading || rest.disabled} {...rest}>
  {#if loading}
    <span class="font-mono">loading...</span>
  {:else}
    {@render children()}
  {/if}
</button>
