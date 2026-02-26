<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title: string;
		children: Snippet;
		actions?: Snippet;
		onclose: () => void;
	}

	let { open, title, children, actions, onclose }: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-ink/40 flex items-center justify-center p-4" role="dialog">
		<div class="border-2 border-ink bg-surface w-full max-w-md">
			<div class="flex items-center justify-between border-b-2 border-ink px-6 py-4">
				<h2 class="font-mono text-sm font-semibold uppercase tracking-wider">{title}</h2>
				<Button variant="ghost" onclick={onclose}>✕</Button>
			</div>
			<div class="px-6 py-4">
				{@render children()}
			</div>
			{#if actions}
				<div class="flex justify-end gap-2 border-t-2 border-ink px-6 py-4">
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
{/if}
