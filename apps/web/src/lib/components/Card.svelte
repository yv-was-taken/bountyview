<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    header?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { header, children, class: className = '' }: Props = $props();
</script>

<div class="border-2 border-ink bg-surface p-6 {className}">
  {#if header}
    <div class="font-mono text-sm font-semibold uppercase tracking-wider pb-4 mb-4 border-b-2 border-ink">
      {@render header()}
    </div>
  {/if}
  {@render children()}
</div>
