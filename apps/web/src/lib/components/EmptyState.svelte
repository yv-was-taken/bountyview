<script lang="ts">
	interface Props {
		message: string;
	}

	let { message }: Props = $props();
</script>

<div class="py-12 text-center">
	<p class="font-mono text-sm text-muted">{message}</p>
</div>
