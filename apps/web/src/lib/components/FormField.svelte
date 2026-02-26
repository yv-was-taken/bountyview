<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    error?: string;
    children: Snippet;
  }

  let { label, error, children }: Props = $props();
</script>

<div class="space-y-1">
  <label class="block font-mono text-xs font-medium uppercase tracking-wider">{label}</label>
  {@render children()}
  {#if error}
    <p class="font-mono text-xs text-danger">{error}</p>
  {/if}
</div>
