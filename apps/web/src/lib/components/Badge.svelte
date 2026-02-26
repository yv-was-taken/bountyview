<script lang="ts">
  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
    children: import('svelte').Snippet;
  }

  let { variant = 'default', children }: Props = $props();

  const variants = {
    default: 'border-ink text-ink',
    success: 'border-brand text-brand',
    warning: 'border-accent text-accent',
    danger: 'border-danger text-danger',
    muted: 'border-muted text-muted'
  };
</script>

<span class="inline-block font-mono text-xs font-medium border px-2 py-0.5 uppercase tracking-wide {variants[variant]}">
  {@render children()}
</span>
