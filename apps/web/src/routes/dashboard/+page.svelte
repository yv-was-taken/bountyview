<script lang="ts">
  const { data } = $props();

  async function setRole(role: 'employer' | 'candidate') {
    const res = await fetch('/api/session/role', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role })
    });

    const body = await res.json();
    alert(res.ok ? `Role updated to ${body.role}. Refreshing dashboard.` : body.error ?? 'Failed to switch role');

    if (res.ok) {
      location.reload();
    }
  }

  async function blockCandidate(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      candidateId: String(formData.get('candidateId') ?? ''),
      reason: String(formData.get('reason') ?? '')
    };

    const res = await fetch('/api/employer/blocks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    alert(res.ok ? 'Candidate blocked.' : body.error ?? 'Failed to block');
  }

  async function unblockCandidate(candidateId: string) {
    const res = await fetch(`/api/employer/blocks/${candidateId}`, { method: 'DELETE' });
    const body = await res.json();
    alert(res.ok ? 'Candidate unblocked.' : body.error ?? 'Failed to unblock');
  }

  async function markFunded(bountyId: string) {
    const txHash = prompt('Enter Base transaction hash for createBounty funding');
    const onchainBountyId = prompt('Enter on-chain bounty ID');

    if (!txHash || !onchainBountyId) return;

    const res = await fetch(`/api/bounties/${bountyId}/fund`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ txHash, onchainBountyId })
    });

    const body = await res.json();
    alert(res.ok ? 'Funding recorded.' : body.error ?? 'Funding update failed');
  }

  async function cancelBounty(bountyId: string) {
    const txHash = prompt('Optional withdraw transaction hash');
    const res = await fetch(`/api/bounties/${bountyId}/withdraw`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ txHash: txHash || undefined })
    });

    const body = await res.json();
    alert(res.ok ? 'Bounty cancelled.' : body.error ?? 'Cancel failed');
  }
</script>

{#if data.role === 'employer'}
  <section class="grid" style="gap: 1rem;">
    <h1>Employer Dashboard</h1>
    <div style="display: flex; gap: 0.5rem;">
      <button class="secondary" on:click={() => setRole('candidate')}>Switch to Candidate</button>
    </div>

    <article class="card">
      <h2>Your Bounties</h2>
      {#if data.ownBounties.length === 0}
        <p>No bounties yet.</p>
      {:else}
        <ul>
          {#each data.ownBounties as bounty}
            <li>
              <a href={`/bounties/${bounty.id}`}>{bounty.jobTitle}</a>
              ({bounty.status})
              - <a href={`/bounties/${bounty.id}/submissions`}>Review submissions</a>
              <button class="secondary" on:click={() => markFunded(bounty.id)}>Link Funding</button>
              <button class="secondary" on:click={() => cancelBounty(bounty.id)}>Cancel</button>
            </li>
          {/each}
        </ul>
      {/if}
    </article>

    <article class="card">
      <h2>Block Candidate</h2>
      <form class="grid" style="gap: 0.75rem;" on:submit={blockCandidate}>
        <label>Candidate ID <input name="candidateId" required /></label>
        <label>Reason <textarea name="reason" rows="3" required></textarea></label>
        <button type="submit">Block</button>
      </form>

      <h3>Blocked Candidates</h3>
      {#if data.blockedCandidates.length === 0}
        <p>None</p>
      {:else}
        <ul>
          {#each data.blockedCandidates as block}
            <li>
              {block.githubUsername} ({block.candidateId}) - {block.reason}
              <button class="secondary" on:click={() => unblockCandidate(block.candidateId)}>Unblock</button>
            </li>
          {/each}
        </ul>
      {/if}
    </article>
  </section>
{:else}
  <section class="grid" style="gap: 1rem;">
    <h1>Candidate Dashboard</h1>
    <div style="display: flex; gap: 0.5rem;">
      <button class="secondary" on:click={() => setRole('employer')}>Switch to Employer</button>
    </div>

    <article class="card">
      <h2>Your Submissions</h2>
      {#if data.mySubmissions.length === 0}
        <p>No submissions yet.</p>
      {:else}
        <ul>
          {#each data.mySubmissions as submission}
            <li>
              <strong>{submission.bountyTitle}</strong>
              - <a href={submission.githubPrUrl} target="_blank" rel="noreferrer">PR</a>
              {#if submission.isWinner} · Winner{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </article>

    <article class="card">
      <h2>Your Payouts</h2>
      {#if data.myPayouts.length === 0}
        <p>No payouts recorded.</p>
      {:else}
        <ul>
          {#each data.myPayouts as payout}
            <li>{payout.amountUsdc} USDC · {payout.status} · {payout.provider}</li>
          {/each}
        </ul>
      {/if}
    </article>
  </section>
{/if}
