<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Card, Input, Textarea, Select, toast } from '$lib/components';

  const { data } = $props();

  let feedback = $state('');
  let submitting = $state(false);
  let taskSource = $state('custom');

  async function createBounty(event: SubmitEvent) {
    event.preventDefault();
    feedback = '';
    submitting = true;

    try {
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
        submissionDeadline: new Date(
          String(formData.get('submissionDeadline') ?? '')
        ).toISOString(),
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
        toast.error(feedback);
        return;
      }

      toast.success('Bounty created successfully. Funding pending.');
      form.reset();
      goto(`/bounties/${body.bounty.id}`);
    } catch (err) {
      feedback = 'Something went wrong. Please try again.';
      toast.error(feedback);
    } finally {
      submitting = false;
    }
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="font-mono text-2xl font-bold mb-2">Create Bounty</h1>
  <p class="font-mono text-sm text-muted mb-8">
    Every bounty is part of a hiring process. Be explicit about deliverables and what happens after.
  </p>

  <Card>
    <form class="flex flex-col gap-5" onsubmit={createBounty}>
      <Input label="Job Title" name="jobTitle" required placeholder="Senior Backend Engineer" />

      <Select label="Role Level" name="roleLevel" required>
        <option value="junior">Junior</option>
        <option value="mid">Mid</option>
        <option value="senior">Senior</option>
        <option value="staff">Staff</option>
        <option value="lead">Lead</option>
      </Select>

      <Input label="Company Name" name="companyName" required placeholder="Acme Corp" />

      <Input
        label="Bounty Amount (USDC)"
        name="bountyAmountUsdc"
        type="number"
        min="1"
        step="0.01"
        required
        placeholder="500"
      />

      <Input
        label="Submission Deadline"
        name="submissionDeadline"
        type="datetime-local"
        required
      />

      <Input
        label="Grace Period Days"
        name="gracePeriodDays"
        type="number"
        min="1"
        max="30"
        value="7"
        required
      />

      <Select
        label="Task Source"
        name="taskSource"
        required
        onchange={(e: Event) => {
          taskSource = (e.currentTarget as HTMLSelectElement).value;
        }}
      >
        <option value="custom">Custom Task</option>
        <option value="template">From Template</option>
      </Select>

      {#if taskSource === 'template'}
        <Select label="Template" name="templateId">
          <option value="">Select a template...</option>
          {#each data.templates as template}
            <option value={template.id}>{template.title}</option>
          {/each}
        </Select>
      {/if}

      <Input
        label="Tech Stack Tags (comma-separated)"
        name="techStackTags"
        required
        placeholder="Go, PostgreSQL, Docker"
      />

      <Input
        label="Repo Template URL (optional)"
        name="repoTemplateUrl"
        placeholder="https://github.com/org/template"
      />

      <Textarea
        label="Company Description"
        name="companyDescription"
        rows={3}
        placeholder="Tell candidates about your company..."
      />

      <Textarea
        label="Task Description"
        name="taskDescription"
        rows={8}
        required
        placeholder="Describe the technical task in detail (Markdown supported)..."
      />

      <Textarea
        label="Deliverables (one per line: label|type|description)"
        name="deliverables"
        rows={5}
        required
      >Just the code|code_only|Working repository
Commit history + PR description + decision log|commit_history_and_pr|Show your process</Textarea>

      <Textarea
        label="What Happens After"
        name="whatHappensAfter"
        rows={3}
        required
        placeholder="Describe the next steps after submission review..."
      />

      {#if feedback}
        <p class="font-mono text-sm text-danger">{feedback}</p>
      {/if}

      <Button type="submit" class="w-full" loading={submitting}>Create Bounty</Button>
    </form>
  </Card>
</div>
