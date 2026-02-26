<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, toast } from '$lib/components';

  const { data } = $props();

  async function acceptTerms() {
    try {
      const res = await fetch('/api/session/terms/accept', { method: 'POST' });

      let body: Record<string, unknown>;
      try {
        body = await res.json();
      } catch {
        toast.error('Unexpected response from server');
        return;
      }

      if (!res.ok) {
        toast.error((body.error as string) ?? 'Unable to accept terms');
        return;
      }

      toast.success('Terms accepted');
      await goto('/dashboard');
    } catch {
      toast.error('Network error — please try again');
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-8 py-8">
  <div>
    <h1 class="font-mono text-2xl font-bold">BountyView Terms of Use</h1>
    <p class="text-sm text-muted leading-relaxed mt-2">
      These terms govern submission usage rights, employer obligations, and bounty payout requirements.
    </p>
  </div>

  <div class="border-t-2 border-ink pt-6">
    <h2 class="font-mono text-lg font-semibold mt-8">Submission Copyright and Usage</h2>
    <p class="text-sm text-muted leading-relaxed mt-4">
      Candidate submissions remain copyrighted works of the candidate unless a separate written agreement is executed.
      Employers may review submissions solely for interview evaluation.
    </p>
    <p class="text-sm text-muted leading-relaxed mt-4">
      Employers must not use, copy, deploy, commercialize, or derive production work from any submission unless the
      employer has awarded and paid the bounty to that candidate according to the listed bounty terms.
    </p>
  </div>

  <div class="border-t-2 border-ink pt-6">
    <h2 class="font-mono text-lg font-semibold mt-8">Employer Obligations</h2>
    <ul class="text-sm text-muted leading-relaxed mt-4 list-disc list-inside space-y-2">
      <li>Do not post interview tasks without real hiring intent.</li>
      <li>Do not use submission code without awarding payout to the selected winner.</li>
      <li>If cancelling a bounty with submissions, reject all submissions explicitly in-platform before cancellation.</li>
    </ul>
  </div>

  <div class="border-t-2 border-ink pt-6">
    <h2 class="font-mono text-lg font-semibold mt-8">Candidate Obligations</h2>
    <ul class="text-sm text-muted leading-relaxed mt-4 list-disc list-inside space-y-2">
      <li>Submit work only through the assigned bounty repository and branch.</li>
      <li>Provide authentic process artifacts and ownership of submitted work.</li>
    </ul>
  </div>

  {#if data.isAuthenticated}
    <div class="border-t-2 border-ink pt-6">
      <Button onclick={acceptTerms}>Accept Terms and Continue</Button>
    </div>
  {/if}
</div>
