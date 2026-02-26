<script lang="ts">
  import '../app.css';
  import { Nav, Toast } from '$lib/components';

  const { children, data } = $props();
</script>

<Nav user={data.currentUser} session={data.session} />

<main class="max-w-[960px] mx-auto px-4 py-8">
  {@render children()}
</main>

<Toast />
