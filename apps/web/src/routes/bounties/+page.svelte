<script lang="ts">
  import { Badge, Button, EmptyState, Input, Select } from '$lib/components';

  const { data } = $props();
</script>

<section class="space-y-6">
  <div class="border-2 border-ink bg-surface p-4">
    <form method="GET" class="flex flex-wrap items-end gap-4">
      <Select name="level" label="Role Level" value={data.filters.level ?? ''}>
        <option value="">All levels</option>
        <option value="junior">Junior</option>
        <option value="mid">Mid</option>
        <option value="senior">Senior</option>
        <option value="staff">Staff</option>
        <option value="lead">Lead</option>
      </Select>

      <Input
        name="minAmount"
        label="Min USDC"
        type="number"
        value={data.filters.minAmount ?? ''}
        placeholder="0"
      />

      <Input
        name="maxAmount"
        label="Max USDC"
        type="number"
        value={data.filters.maxAmount ?? ''}
        placeholder="10000"
      />

      <Input
        name="tags"
        label="Tags"
        value={data.filters.tags ?? ''}
        placeholder="Go, PostgreSQL, Docker"
      />

      <Button type="submit" variant="primary">Apply Filters</Button>
    </form>
  </div>

  {#if data.bounties.length === 0}
    <EmptyState message="No bounties found" />
  {:else}
    <div class="space-y-4">
      {#each data.bounties as bounty}
        <a href="/bounties/{bounty.id}" class="block border-2 border-ink bg-surface p-4 transition-all duration-150 hover:border-brand no-underline text-ink">
          <div class="flex items-start justify-between gap-4">
            <span class="font-mono font-semibold">{bounty.jobTitle}</span>
            <span class="font-mono text-lg font-bold text-brand whitespace-nowrap">{bounty.bountyAmountUsdc} USDC</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <span class="text-sm text-muted">{bounty.companyName}</span>
            <Badge>{bounty.roleLevel}</Badge>
            <span class="text-sm text-muted">Deadline: {new Date(bounty.submissionDeadline).toLocaleDateString()}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
