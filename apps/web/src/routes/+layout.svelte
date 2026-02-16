<script lang="ts">
  import '$lib/styles/global.css';

  const { children, data } = $props();
</script>

<nav class="card" style="margin: 1rem auto; max-width: 1080px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
  <strong><a href="/" style="text-decoration: none; color: inherit;">BountyView</a></strong>
  <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
    <a href="/bounties">Bounties</a>
    <a href="/terms">Terms</a>
    {#if data.currentUser?.role === 'employer'}
      <a href="/bounties/new">Post Bounty</a>
      <a href="/templates">Templates</a>
    {/if}
    {#if data.session}
      <a href="/dashboard">Dashboard</a>
      <a href="/wallet">Wallet</a>
      <form action="/signout" method="post" style="display: inline;">
        <button class="secondary" type="submit">Sign out</button>
      </form>
    {:else}
      <a href="/login">Log in</a>
    {/if}
  </div>
</nav>

<main>
  {@render children()}
</main>
