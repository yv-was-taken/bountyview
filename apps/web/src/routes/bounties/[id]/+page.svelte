<script lang="ts">
  import { Card, Badge, Button, toast } from '$lib/components';

  const { data } = $props();

  const bounty = $derived(data.bounty);

  let claiming = $state(false);

  async function claimBounty() {
    claiming = true;
    try {
      const res = await fetch(`/api/bounties/${bounty.id}/claim`, { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Repo ready: ${body.repoFullName}. Branch: ${body.branchName}`);
      } else {
        toast.error(body.error ?? 'Unable to claim bounty');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      claiming = false;
    }
  }

  const statusVariant = $derived(
    bounty.status === 'open'
      ? 'success'
      : bounty.status === 'cancelled'
        ? 'danger'
        : bounty.status === 'review'
          ? 'warning'
          : 'muted'
  ) satisfies 'success' | 'danger' | 'warning' | 'muted';

  const formattedDeadline = $derived(
    new Date(bounty.submissionDeadline).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  );
</script>

<svelte:head>
  <title>{bounty.jobTitle} — BountyView</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8">
  <!-- Page header -->
  <div class="mb-8">
    <h1 class="font-mono text-3xl font-bold tracking-tight">{bounty.jobTitle}</h1>
    <p class="mt-1 font-mono text-sm text-muted">{bounty.companyName} &middot; {bounty.submissionCount} submission{bounty.submissionCount === 1 ? '' : 's'}</p>
  </div>

  <!-- Two-column grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

    <!-- Left column (2/3 width) -->
    <div class="lg:col-span-2 flex flex-col gap-8">

      <!-- Task description -->
      <Card>
        {#snippet header()}Task Description{/snippet}
        <p class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{bounty.taskDescription}</p>
      </Card>

      <!-- Deliverables -->
      {#if bounty.deliverables && bounty.deliverables.length > 0}
        <Card>
          {#snippet header()}Deliverables{/snippet}
          <div class="flex flex-col divide-y divide-ink/20">
            {#each bounty.deliverables as deliverable}
              <div class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Badge variant="default">{deliverable.type}</Badge>
                <div>
                  <span class="font-mono text-sm font-medium">{deliverable.label}</span>
                  {#if deliverable.description}
                    <p class="mt-0.5 text-xs text-muted">{deliverable.description}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}

      <!-- What Happens After -->
      {#if bounty.whatHappensAfter}
        <Card>
          {#snippet header()}What Happens After{/snippet}
          <p class="font-sans text-sm leading-relaxed">{bounty.whatHappensAfter}</p>
        </Card>
      {/if}

      <!-- Repo template -->
      {#if bounty.repoTemplateUrl}
        <Card>
          {#snippet header()}Starter Repo{/snippet}
          <a
            href={bounty.repoTemplateUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-sm text-brand underline underline-offset-2 hover:text-brand/80"
          >
            {bounty.repoTemplateUrl}
          </a>
        </Card>
      {/if}
    </div>

    <!-- Right column (1/3 width) -->
    <div class="flex flex-col gap-8">

      <!-- Metadata card -->
      <Card>
        {#snippet header()}Bounty Details{/snippet}
        <div class="flex flex-col gap-4">
          <!-- Amount -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Amount</span>
            <span class="font-mono text-2xl font-bold">{bounty.bountyAmountUsdc} USDC</span>
          </div>

          <!-- Status -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Status</span>
            <Badge variant={statusVariant}>{bounty.status}</Badge>
          </div>

          <!-- Role level -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Role Level</span>
            <Badge>{bounty.roleLevel}</Badge>
          </div>

          <!-- Company -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Company</span>
            <span class="font-mono text-sm">{bounty.companyName}</span>
          </div>

          <!-- Deadline -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Deadline</span>
            <span class="font-mono text-sm">{formattedDeadline}</span>
          </div>

          <!-- Grace period -->
          <div>
            <span class="block text-xs text-muted uppercase tracking-wide mb-1">Grace Period</span>
            <span class="font-mono text-sm">{bounty.gracePeriodDays} days</span>
          </div>
        </div>
      </Card>

      <!-- CTA buttons -->
      <div class="flex flex-col gap-3">
        <Button onclick={claimBounty} loading={claiming}>Claim Bounty</Button>
        <a href={`/bounties/${bounty.id}/submit`} class="block">
          <Button variant="secondary" class="w-full">Submit Solution</Button>
        </a>
      </div>

      <!-- Tags -->
      {#if bounty.tags && bounty.tags.length > 0}
        <Card>
          {#snippet header()}Tech Stack{/snippet}
          <div class="flex flex-wrap gap-2">
            {#each bounty.tags as tag}
              <Badge variant="muted">{tag}</Badge>
            {/each}
          </div>
        </Card>
      {/if}
    </div>
  </div>
</div>
