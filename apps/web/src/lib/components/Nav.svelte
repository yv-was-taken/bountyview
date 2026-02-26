<script lang="ts">
  import Badge from './Badge.svelte';
  import type { AuthUser } from '@bountyview/shared';

  interface Props {
    user: AuthUser | null;
    session: { user?: unknown } | null;
  }

  let { user, session }: Props = $props();
</script>

<nav class="border-b-2 border-ink bg-surface">
  <div class="max-w-[960px] mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="font-mono text-base font-bold tracking-[0.2em] uppercase text-ink no-underline">
      BountyView
    </a>
    <div class="flex items-center gap-4 font-mono text-sm overflow-x-auto">
      <a href="/bounties" class="text-ink no-underline hover:text-brand transition-colors duration-150">Bounties</a>
      {#if user?.role === 'employer'}
        <a href="/bounties/new" class="text-ink no-underline hover:text-brand transition-colors duration-150">Post</a>
        <a href="/templates" class="text-ink no-underline hover:text-brand transition-colors duration-150">Templates</a>
      {/if}
      {#if session}
        <a href="/dashboard" class="text-ink no-underline hover:text-brand transition-colors duration-150">Dashboard</a>
        <a href="/wallet" class="text-ink no-underline hover:text-brand transition-colors duration-150">Wallet</a>
        {#if user}
          <Badge variant={user.role === 'employer' ? 'success' : 'default'}>{user.role}</Badge>
        {/if}
        <form action="/signout" method="post" class="inline">
          <button class="font-mono text-sm text-muted hover:text-ink bg-transparent border-none cursor-pointer transition-colors duration-150">Sign out</button>
        </form>
      {:else}
        <a href="/login" class="text-ink no-underline hover:text-brand transition-colors duration-150">Log in</a>
      {/if}
    </div>
  </div>
</nav>
