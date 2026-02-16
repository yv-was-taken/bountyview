<script lang="ts">
  const { data } = $props();

  async function chooseWinner(submissionId: string) {
    const winnerAddress = prompt('Enter winner wallet address (0x...)');
    if (!winnerAddress) return;

    const res = await fetch(`/api/bounties/${data.bountyId}/claim-winner`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId, winnerAddress })
    });

    const body = await res.json();
    alert(res.ok ? 'Winner selected and payout initiated.' : body.error ?? 'Failed to select winner');
  }
</script>

<section class="grid" style="gap: 1rem;">
  <h1>Submissions</h1>

  {#if data.submissions.length === 0}
    <article class="card">No submissions yet.</article>
  {:else}
    {#each data.submissions as submission}
      <article class="card">
        <h2 style="margin: 0;">{submission.candidateGithubUsername}</h2>
        <p style="margin: 0.4rem 0;">
          <a href={submission.githubRepoUrl} target="_blank" rel="noreferrer">Repository</a>
          ·
          <a href={submission.githubPrUrl} target="_blank" rel="noreferrer">Pull Request</a>
        </p>
        <p>Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
        {#if submission.isWinner}
          <strong>Winner</strong>
        {:else}
          <button on:click={() => chooseWinner(submission.id)}>Select Winner</button>
        {/if}
      </article>
    {/each}
  {/if}
</section>
