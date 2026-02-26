<script lang="ts">
  const { data } = $props();

  const bounty = $derived(data.bounty);

  async function claimBounty() {
    const res = await fetch(`/api/bounties/${bounty.id}/claim`, { method: 'POST' });
    const body = await res.json();
    alert(
      res.ok
        ? `Repo ready: ${body.repoFullName}. Branch: ${body.branchName}`
        : body.error ?? 'Unable to claim bounty'
    );
  }
</script>

<section class="grid" style="gap: 1rem;">
  <article class="card">
    <h1 style="margin-top: 0;">{bounty.jobTitle}</h1>
    <p style="margin: 0; color: var(--muted);">{bounty.companyName} · {bounty.roleLevel}</p>
    <p><strong>{bounty.bountyAmountUsdc} USDC</strong> · Status: {bounty.status}</p>
    <p>Deadline: {new Date(bounty.submissionDeadline).toLocaleString()}</p>
    <p>Review grace: {bounty.gracePeriodDays} days</p>
    <p>Submissions: {bounty.submissionCount}</p>
  </article>

  <article class="card">
    <h2>Task Description</h2>
    <p style="white-space: pre-wrap;">{bounty.taskDescription}</p>

    <h3>Deliverables</h3>
    <ul>
      {#each bounty.deliverables as deliverable}
        <li>{deliverable.label}{deliverable.description ? ` - ${deliverable.description}` : ''}</li>
      {/each}
    </ul>

    <h3>Tech Stack</h3>
    <p>{bounty.tags.join(', ')}</p>

    <h3>What Happens After</h3>
    <p>{bounty.whatHappensAfter}</p>
  </article>

  <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
    <button onclick={claimBounty}>Claim Bounty</button>
    <a href={`/bounties/${bounty.id}/submit`} class="card" style="text-decoration: none;">Submit Solution</a>
  </div>
</section>
