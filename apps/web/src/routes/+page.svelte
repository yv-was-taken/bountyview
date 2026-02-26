<script lang="ts">
  import { Button } from '$lib/components';
</script>

<div class="space-y-16 py-8">
  <section class="space-y-6">
    <h1 class="font-mono text-3xl font-bold leading-tight">
      Replace technical interviews<br />with paid real work.
    </h1>
    <p class="text-muted max-w-lg">
      Employers fund bounties. Candidates build real solutions. Escrow ensures everyone gets paid fairly.
    </p>
    <div class="flex gap-3">
      <a href="/bounties"><Button>Browse bounties</Button></a>
      <a href="/bounties/new"><Button variant="secondary">Post a bounty</Button></a>
    </div>
  </section>

  <section class="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-ink">
    <div class="p-6 md:border-r-2 border-ink border-b-2 md:border-b-0">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Post</h3>
      <p class="text-sm text-muted">Employers create bounties with USDC escrow. Real tasks, real stakes.</p>
    </div>
    <div class="p-6 md:border-r-2 border-ink border-b-2 md:border-b-0">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Build</h3>
      <p class="text-sm text-muted">Candidates claim bounties and submit production-quality work via GitHub.</p>
    </div>
    <div class="p-6">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Pay</h3>
      <p class="text-sm text-muted">Winner gets paid. On-chain escrow. No games, no ghosting.</p>
    </div>
  </section>
</div>
