<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components';
</script>

<div class="max-w-md mx-auto py-24 text-center space-y-6">
  <h1 class="font-mono text-6xl font-bold">{page.status}</h1>
  <p class="font-mono text-sm text-muted">{page.error?.message ?? 'Something went wrong'}</p>
  <a href="/"><Button variant="secondary">Back to home</Button></a>
</div>
