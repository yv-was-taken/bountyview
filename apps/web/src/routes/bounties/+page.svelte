<script lang="ts">
  const { data } = $props();
</script>

<section class="grid" style="gap: 1rem;">
  <div class="card">
    <h1>Open Bounties</h1>
    <p style="color: var(--muted); margin-top: 0;">Real hiring tasks. Winner takes all.</p>
    <form method="GET" class="grid grid-3" style="align-items: end;">
      <label>
        Role level
        <select name="level" value={data.filters.level ?? ''}>
          <option value="">All</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="lead">Lead</option>
        </select>
      </label>
      <label>
        Min USDC
        <input type="number" name="minAmount" value={data.filters.minAmount ?? ''} />
      </label>
      <label>
        Max USDC
        <input type="number" name="maxAmount" value={data.filters.maxAmount ?? ''} />
      </label>
      <label style="grid-column: 1 / -1;">
        Tags (comma-separated)
        <input name="tags" value={data.filters.tags ?? ''} placeholder="Go, PostgreSQL, Docker" />
      </label>
      <button type="submit">Apply Filters</button>
    </form>
  </div>

  <div class="grid">
    {#if data.bounties.length === 0}
      <article class="card">No bounties match your filters.</article>
    {:else}
      {#each data.bounties as bounty}
        <article class="card">
          <h2 style="margin: 0;"><a href={`/bounties/${bounty.id}`}>{bounty.jobTitle}</a></h2>
          <p style="margin: 0.25rem 0; color: var(--muted);">{bounty.companyName} · {bounty.roleLevel}</p>
          <p style="margin: 0.25rem 0;">{bounty.bountyAmountUsdc} USDC</p>
          <small>Deadline: {new Date(bounty.submissionDeadline).toLocaleString()}</small>
        </article>
      {/each}
    {/if}
  </div>
</section>
