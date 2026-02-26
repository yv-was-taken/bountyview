<script lang="ts">
	import { toasts, dismissToast } from './toast';

	const borderColors = {
		success: 'border-brand',
		error: 'border-danger',
		info: 'border-ink'
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
	{#each $toasts as t (t.id)}
		<button
			class="border-2 bg-surface px-4 py-3 font-mono text-sm text-left transition-all duration-150 hover:opacity-80 cursor-pointer {borderColors[t.type]}"
			onclick={() => dismissToast(t.id)}
		>
			{t.message}
		</button>
	{/each}
</div>
