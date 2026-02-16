<script lang="ts">
  import { goto } from '$app/navigation';

  const { data } = $props();

  async function accept() {
    try {
      const res = await fetch('/api/session/terms/accept', { method: 'POST' });

      let body: Record<string, unknown>;
      try {
        body = await res.json();
      } catch {
        alert('Unexpected response from server');
        return;
      }

      if (!res.ok) {
        alert(body.error ?? 'Unable to accept terms');
        return;
      }

      await goto('/dashboard');
    } catch {
      alert('Network error — please try again');
    }
  }
</script>

<section class="card" style="max-width: 860px; margin: 1rem auto;">
  <h1>BountyView Terms of Use</h1>
  <p style="color: var(--muted);">
    These terms govern submission usage rights, employer obligations, and bounty payout requirements.
  </p>

  <h2>Submission Copyright and Usage</h2>
  <p>
    Candidate submissions remain copyrighted works of the candidate unless a separate written agreement is executed.
    Employers may review submissions solely for interview evaluation.
  </p>
  <p>
    Employers must not use, copy, deploy, commercialize, or derive production work from any submission unless the
    employer has awarded and paid the bounty to that candidate according to the listed bounty terms.
  </p>

  <h2>Employer Obligations</h2>
  <ul>
    <li>Do not post interview tasks without real hiring intent.</li>
    <li>Do not use submission code without awarding payout to the selected winner.</li>
    <li>If cancelling a bounty with submissions, reject all submissions explicitly in-platform before cancellation.</li>
  </ul>

  <h2>Candidate Obligations</h2>
  <ul>
    <li>Submit work only through the assigned bounty repository and branch.</li>
    <li>Provide authentic process artifacts and ownership of submitted work.</li>
  </ul>

  {#if data.isAuthenticated}
    <button onclick={accept}>Accept Terms and Continue</button>
  {:else}
    <p>
      <a href="/login">Log in with GitHub</a> to accept terms.
    </p>
  {/if}
</section>
