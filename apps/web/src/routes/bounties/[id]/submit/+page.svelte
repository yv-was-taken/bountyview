<script lang="ts">
  const { data } = $props();

  async function submitSolution(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      githubRepoUrl: String(formData.get('githubRepoUrl') ?? ''),
      githubPrUrl: String(formData.get('githubPrUrl') ?? ''),
      customDeliverables: String(formData.get('customDeliverables') ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ label: line }))
    };

    const res = await fetch(`/api/bounties/${data.bounty.id}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    alert(res.ok ? 'Submission recorded successfully.' : body.error ?? 'Failed to submit');
  }
</script>

<section class="card">
  <h1>Submit Solution</h1>
  <p><strong>{data.bounty.jobTitle}</strong> · {data.bounty.companyName}</p>
  <p style="color: var(--muted);">
    Submission must reference the assigned BountyView repository and your designated candidate branch.
  </p>

  <form class="grid" style="gap: 1rem;" on:submit={submitSolution}>
    <label>
      Repository URL
      <input type="url" name="githubRepoUrl" required placeholder="https://github.com/org/repo" />
    </label>
    <label>
      Pull Request URL
      <input type="url" name="githubPrUrl" required placeholder="https://github.com/org/repo/pull/123" />
    </label>
    <label>
      Custom deliverables (one line each)
      <textarea name="customDeliverables" rows="5" placeholder="Loom walkthrough\nDesign notes"></textarea>
    </label>
    <button type="submit">Submit Bounty</button>
  </form>
</section>
