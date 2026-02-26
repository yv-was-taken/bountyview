<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Card, Input, Textarea, toast } from '$lib/components';

  const { data } = $props();

  let loading = $state(false);

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

    loading = true;
    try {
      const res = await fetch(`/api/bounties/${data.bounty.id}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await res.json();

      if (res.ok) {
        toast.success('Submission recorded successfully.');
        goto(`/bounties/${data.bounty.id}`);
      } else {
        toast.error(body.error ?? 'Failed to submit');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      loading = false;
    }
  }
</script>

<h1 class="font-mono text-2xl font-bold mb-6">{data.bounty.jobTitle}</h1>

<Card>
  <p class="font-mono text-xs text-muted mb-6">
    Submission must reference the assigned BountyView repository and your designated candidate branch.
  </p>

  <form class="flex flex-col gap-4" onsubmit={submitSolution}>
    <Input
      label="Repository URL"
      type="url"
      name="githubRepoUrl"
      required
      placeholder="https://github.com/org/repo"
    />

    <Input
      label="Pull Request URL"
      type="url"
      name="githubPrUrl"
      required
      placeholder="https://github.com/org/repo/pull/123"
    />

    <Textarea
      label="Custom Deliverables (one per line)"
      name="customDeliverables"
      rows={5}
      placeholder="Loom walkthrough&#10;Design notes"
    />

    <div class="pt-2">
      <Button type="submit" {loading}>Submit Solution</Button>
    </div>
  </form>
</Card>
