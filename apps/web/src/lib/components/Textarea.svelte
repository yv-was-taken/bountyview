<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, ...rest }: Props = $props();
</script>

<div>
  {#if label}
    <label class="block font-mono text-xs font-medium uppercase tracking-wider mb-1">{label}</label>
  {/if}
  <textarea
    class="w-full border-2 border-ink bg-surface px-3 py-2 font-sans text-sm outline-none resize-y transition-all duration-150 focus:ring-2 focus:ring-brand focus:ring-offset-2 {error ? 'border-danger' : ''}"
    {...rest}
  ></textarea>
  {#if error}
    <p class="font-mono text-xs text-danger mt-1">{error}</p>
  {/if}
</div>
