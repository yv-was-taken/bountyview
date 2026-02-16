<script lang="ts">
  const { data } = $props();

  let feedback = '';

  async function createBounty(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const deliverablesRaw = String(formData.get('deliverables') ?? '');
    const deliverables = deliverablesRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, type, description] = line.split('|').map((part) => part.trim());
        return {
          label,
          type,
          description: description || undefined
        };
      });

    const payload = {
      jobTitle: String(formData.get('jobTitle') ?? ''),
      roleLevel: String(formData.get('roleLevel') ?? ''),
      companyName: String(formData.get('companyName') ?? ''),
      companyDescription: String(formData.get('companyDescription') ?? ''),
      techStackTags: String(formData.get('techStackTags') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      taskDescription: String(formData.get('taskDescription') ?? ''),
      taskSource: String(formData.get('taskSource') ?? ''),
      templateId: String(formData.get('templateId') ?? '') || undefined,
      repoTemplateUrl: String(formData.get('repoTemplateUrl') ?? '') || undefined,
      deliverables,
      bountyAmountUsdc: Number(formData.get('bountyAmountUsdc') ?? 0),
      submissionDeadline: new Date(String(formData.get('submissionDeadline') ?? '')).toISOString(),
      gracePeriodDays: Number(formData.get('gracePeriodDays') ?? 7),
      whatHappensAfter: String(formData.get('whatHappensAfter') ?? '')
    };

    const res = await fetch('/api/bounties', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();

    if (!res.ok) {
      feedback = body.error ?? 'Failed to create bounty';
      return;
    }

    feedback = `Bounty created: ${body.bounty.id}. Funding pending.`;
    form.reset();
  }
</script>

<section class="card">
  <h1>Create Bounty</h1>
  <p style="color: var(--muted);">
    Every bounty is part of a hiring process. Be explicit about deliverables and what happens after.
  </p>

  <form class="grid" style="gap: 0.9rem;" on:submit={createBounty}>
    <div class="grid grid-2">
      <label>Job Title<input name="jobTitle" required /></label>
      <label>Role Level
        <select name="roleLevel" required>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="lead">Lead</option>
        </select>
      </label>
      <label>Company Name<input name="companyName" required /></label>
      <label>Bounty Amount (USDC)<input name="bountyAmountUsdc" type="number" min="1" step="0.01" required /></label>
      <label>Submission Deadline<input name="submissionDeadline" type="datetime-local" required /></label>
      <label>Review Grace Period Days<input name="gracePeriodDays" type="number" min="1" max="30" value="7" required /></label>
      <label>Task Source
        <select name="taskSource" required>
          <option value="custom">Custom Task</option>
          <option value="template">From Template</option>
        </select>
      </label>
      <label>Template (optional)
        <select name="templateId">
          <option value="">None</option>
          {#each data.templates as template}
            <option value={template.id}>{template.title}</option>
          {/each}
        </select>
      </label>
      <label style="grid-column: 1 / -1;">Tech Stack Tags (comma-separated)
        <input name="techStackTags" placeholder="Go, PostgreSQL, Docker" required />
      </label>
      <label style="grid-column: 1 / -1;">Repo Template URL (optional)
        <input name="repoTemplateUrl" placeholder="https://github.com/org/template" />
      </label>
      <label style="grid-column: 1 / -1;">Company Description
        <textarea name="companyDescription" rows="3"></textarea>
      </label>
      <label style="grid-column: 1 / -1;">Task Description (Markdown)
        <textarea name="taskDescription" rows="8" required></textarea>
      </label>
      <label style="grid-column: 1 / -1;">Deliverables (one per line; use `label|type|description`)
        <textarea name="deliverables" rows="5" required>Just the code|code_only|Working repository
Commit history + PR description + decision log|commit_history_and_pr|Show your process</textarea>
      </label>
      <label style="grid-column: 1 / -1;">What Happens After
        <textarea name="whatHappensAfter" rows="3" required></textarea>
      </label>
    </div>

    <button type="submit">Create Bounty</button>
  </form>

  <p style="margin-top: 1rem; color: var(--muted);">{feedback}</p>
</section>
