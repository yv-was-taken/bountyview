<script lang="ts">
  import { Button, Card, Badge, Input, Textarea, Modal, EmptyState, toast } from '$lib/components';

  const { data } = $props();

  const ownBounties = $derived(data.ownBounties ?? []);
  const blockedCandidates = $derived(data.blockedCandidates ?? []);
  const mySubmissions = $derived(data.mySubmissions ?? []);
  const myPayouts = $derived(data.myPayouts ?? []);

  // --- Fund Modal state ---
  let fundModalOpen = $state(false);
  let fundBountyId = $state('');
  let fundTxHash = $state('');
  let fundLoading = $state(false);

  function openFundModal(bountyId: string) {
    fundBountyId = bountyId;
    fundTxHash = '';
    fundModalOpen = true;
  }

  // --- Cancel Modal state ---
  let cancelModalOpen = $state(false);
  let cancelBounty: { id: string; onchainBountyId?: string | null } | null = $state(null);
  let cancelSubmissionCount = $state(0);
  let cancelRejectionReason = $state('');
  let cancelTxHash = $state('');
  let cancelLoading = $state(false);

  // --- Block form state ---
  let blockCandidateId = $state('');
  let blockReason = $state('');
  let blockLoading = $state(false);

  // --- Role switching ---
  let switchingRole = $state(false);

  async function setRole(role: 'employer' | 'candidate') {
    switchingRole = true;
    try {
      const res = await fetch('/api/session/role', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role })
      });

      const body = await res.json();
      if (res.ok) {
        toast.success(`Role updated to ${body.role}. Refreshing dashboard.`);
        location.reload();
      } else {
        toast.error(body.error ?? 'Failed to switch role');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      switchingRole = false;
    }
  }

  // --- Block / Unblock candidates ---
  async function handleBlockCandidate() {
    blockLoading = true;
    try {
      const res = await fetch('/api/employer/blocks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidateId: blockCandidateId, reason: blockReason })
      });

      const body = await res.json();
      if (res.ok) {
        toast.success('Candidate blocked.');
        blockCandidateId = '';
        blockReason = '';
      } else {
        toast.error(body.error ?? 'Failed to block');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      blockLoading = false;
    }
  }

  async function unblockCandidate(candidateId: string) {
    try {
      const res = await fetch(`/api/employer/blocks/${candidateId}`, { method: 'DELETE' });
      const body = await res.json();
      if (res.ok) {
        toast.success('Candidate unblocked.');
      } else {
        toast.error(body.error ?? 'Failed to unblock');
      }
    } catch {
      toast.error('Network error — please try again');
    }
  }

  // --- Mark funded ---
  async function markFunded(bountyId: string) {
    if (!fundTxHash.trim()) return;
    fundLoading = true;
    try {
      const res = await fetch(`/api/bounties/${bountyId}/fund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txHash: fundTxHash.trim() })
      });

      const body = await res.json();
      if (res.ok) {
        toast.success('Funding recorded.');
        fundModalOpen = false;
      } else {
        toast.error(body.error ?? 'Funding update failed');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      fundLoading = false;
    }
  }

  // --- Cancel bounty ---
  async function openCancelModal(bounty: { id: string; onchainBountyId?: string | null }) {
    cancelBounty = bounty;
    cancelRejectionReason = '';
    cancelTxHash = '';
    cancelSubmissionCount = 0;
    cancelLoading = false;

    try {
      const submissionsRes = await fetch(`/api/bounties/${bounty.id}/submissions`);
      const submissionsBody = await submissionsRes.json();
      if (!submissionsRes.ok) {
        toast.error(submissionsBody.error ?? 'Unable to load submissions for cancellation');
        return;
      }
      const submissions: Array<{ id: string }> = submissionsBody.submissions ?? [];
      cancelSubmissionCount = submissions.length;
    } catch {
      toast.error('Network error — please try again');
      return;
    }

    cancelModalOpen = true;
  }

  async function confirmCancelBounty() {
    if (!cancelBounty) return;
    cancelLoading = true;

    try {
      const rejections: Array<{ submissionId: string; reason: string }> = [];

      if (cancelSubmissionCount > 0) {
        if (!cancelRejectionReason.trim()) {
          toast.error('Please provide a rejection reason for existing submissions.');
          cancelLoading = false;
          return;
        }
        const submissionsRes = await fetch(`/api/bounties/${cancelBounty.id}/submissions`);
        const submissionsBody = await submissionsRes.json();
        const submissions: Array<{ id: string }> = submissionsBody.submissions ?? [];
        for (const submission of submissions) {
          rejections.push({ submissionId: submission.id, reason: cancelRejectionReason.trim() });
        }
      }

      let txHash: string | undefined;
      if (cancelBounty.onchainBountyId) {
        if (!cancelTxHash.trim()) {
          toast.error('Transaction hash is required for funded bounties.');
          cancelLoading = false;
          return;
        }
        txHash = cancelTxHash.trim();
      }

      const res = await fetch(`/api/bounties/${cancelBounty.id}/withdraw`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txHash, rejections })
      });

      const body = await res.json();
      if (res.ok) {
        toast.success('Bounty cancelled.');
        cancelModalOpen = false;
      } else {
        toast.error(body.error ?? 'Cancel failed');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      cancelLoading = false;
    }
  }

  function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'muted' {
    if (status === 'open') return 'success';
    if (status === 'cancelled' || status === 'expired') return 'danger';
    if (status === 'claimed') return 'warning';
    return 'muted';
  }

  function reviewVariant(status: string): 'success' | 'danger' | 'warning' | 'muted' {
    if (status === 'winner') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'pending') return 'warning';
    return 'muted';
  }

  function payoutVariant(status: string): 'success' | 'danger' | 'warning' | 'muted' {
    if (status === 'completed') return 'success';
    if (status === 'failed' || status === 'cancelled') return 'danger';
    if (status === 'processing' || status === 'pending') return 'warning';
    return 'muted';
  }
</script>

<svelte:head>
  <title>Dashboard — BountyView</title>
</svelte:head>

{#if data.role === 'employer'}
  <!-- ===================== EMPLOYER VIEW ===================== -->
  <div class="space-y-8">
    <div>
      <h1 class="font-mono text-2xl font-bold">Employer Dashboard</h1>
      <div class="mt-3">
        <Button variant="secondary" onclick={() => setRole('candidate')} loading={switchingRole}>
          Switch to Candidate
        </Button>
      </div>
    </div>

    <!-- Your Bounties -->
    <Card>
      {#snippet header()}
        Your Bounties
      {/snippet}
      {#if ownBounties.length === 0}
        <EmptyState message="No bounties yet." />
      {:else}
        <div class="divide-y divide-ink">
          {#each ownBounties as bounty}
            <div class="border-b border-ink last:border-b-0 py-3 first:pt-0 last:pb-0">
              <div class="flex flex-wrap items-center gap-3">
                <a href={`/bounties/${bounty.id}`} class="font-mono font-semibold hover:underline">
                  {bounty.jobTitle}
                </a>
                <Badge variant={statusVariant(bounty.status)}>{bounty.status}</Badge>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`/bounties/${bounty.id}/submissions`}
                  class="font-mono text-sm text-brand hover:underline"
                >
                  Review
                </a>
                <Button variant="secondary" onclick={() => openFundModal(bounty.id)}>
                  Fund
                </Button>
                <Button variant="danger" onclick={() => openCancelModal(bounty)}>
                  Cancel
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- Block Candidate -->
    <Card>
      {#snippet header()}
        Block Candidate
      {/snippet}
      <form
        class="space-y-4"
        onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleBlockCandidate(); }}
      >
        <Input
          label="Candidate ID"
          value={blockCandidateId}
          oninput={(e: Event & { currentTarget: HTMLInputElement }) => (blockCandidateId = e.currentTarget.value)}
          required
          placeholder="Enter candidate user ID"
        />
        <Textarea
          label="Reason"
          value={blockReason}
          oninput={(e: Event & { currentTarget: HTMLTextAreaElement }) => (blockReason = e.currentTarget.value)}
          rows={3}
          required
          placeholder="Why is this candidate being blocked?"
        />
        <Button type="submit" loading={blockLoading}>Block Candidate</Button>
      </form>
    </Card>

    <!-- Blocked Candidates -->
    <Card>
      {#snippet header()}
        Blocked Candidates
      {/snippet}
      {#if blockedCandidates.length === 0}
        <EmptyState message="No blocked candidates." />
      {:else}
        <div class="divide-y divide-ink">
          {#each blockedCandidates as block}
            <div class="border-b border-ink last:border-b-0 py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="font-mono font-semibold">{block.githubUsername}</span>
                <span class="text-sm text-muted ml-2">({block.candidateId})</span>
                {#if block.reason}
                  <span class="text-sm text-muted ml-2">— {block.reason}</span>
                {/if}
              </div>
              <Button variant="secondary" onclick={() => unblockCandidate(block.candidateId)}>
                Unblock
              </Button>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>

  <!-- Fund Modal -->
  <Modal open={fundModalOpen} title="Link Funding" onclose={() => { fundModalOpen = false; }}>
    <div class="space-y-4">
      <p class="text-sm text-muted">Enter the Base transaction hash for createBounty funding.</p>
      <Input
        label="Transaction Hash"
        value={fundTxHash}
        oninput={(e: Event & { currentTarget: HTMLInputElement }) => (fundTxHash = e.currentTarget.value)}
        required
        placeholder="0x..."
      />
    </div>
    {#snippet actions()}
      <Button variant="secondary" onclick={() => { fundModalOpen = false; }}>Cancel</Button>
      <Button loading={fundLoading} onclick={() => markFunded(fundBountyId)}>Confirm</Button>
    {/snippet}
  </Modal>

  <!-- Cancel Modal -->
  <Modal open={cancelModalOpen} title="Cancel Bounty" onclose={() => { cancelModalOpen = false; }}>
    <div class="space-y-4">
      {#if cancelSubmissionCount > 0}
        <div class="border-2 border-danger bg-danger/10 p-3">
          <p class="font-mono text-sm text-danger font-semibold">
            Warning: {cancelSubmissionCount} submission{cancelSubmissionCount === 1 ? '' : 's'} will be rejected.
          </p>
        </div>
        <Textarea
          label="Rejection Reason"
          value={cancelRejectionReason}
          oninput={(e: Event & { currentTarget: HTMLTextAreaElement }) => (cancelRejectionReason = e.currentTarget.value)}
          rows={3}
          required
          placeholder="Reason for rejecting all submissions"
        />
      {/if}
      {#if cancelBounty?.onchainBountyId}
        <Input
          label="Cancel/Withdraw Transaction Hash"
          value={cancelTxHash}
          oninput={(e: Event & { currentTarget: HTMLInputElement }) => (cancelTxHash = e.currentTarget.value)}
          required
          placeholder="0x..."
        />
      {/if}
      {#if cancelSubmissionCount === 0 && !cancelBounty?.onchainBountyId}
        <p class="text-sm text-muted">Are you sure you want to cancel this bounty?</p>
      {/if}
    </div>
    {#snippet actions()}
      <Button variant="secondary" onclick={() => { cancelModalOpen = false; }}>Cancel</Button>
      <Button variant="danger" loading={cancelLoading} onclick={confirmCancelBounty}>
        Confirm Cancellation
      </Button>
    {/snippet}
  </Modal>

{:else}
  <!-- ===================== CANDIDATE VIEW ===================== -->
  <div class="space-y-8">
    <div>
      <h1 class="font-mono text-2xl font-bold">Candidate Dashboard</h1>
      <div class="mt-3">
        <Button variant="secondary" onclick={() => setRole('employer')} loading={switchingRole}>
          Switch to Employer
        </Button>
      </div>
    </div>

    <!-- Your Submissions -->
    <Card>
      {#snippet header()}
        Your Submissions
      {/snippet}
      {#if mySubmissions.length === 0}
        <EmptyState message="No submissions yet." />
      {:else}
        <div class="divide-y divide-ink">
          {#each mySubmissions as submission}
            <div class="border-b border-ink last:border-b-0 py-3 first:pt-0 last:pb-0">
              <div class="flex flex-wrap items-center gap-3">
                <span class="font-mono font-semibold">{submission.bountyTitle}</span>
                <Badge variant={reviewVariant(submission.reviewStatus)}>{submission.reviewStatus}</Badge>
                {#if submission.isWinner}
                  <Badge variant="success">Winner</Badge>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-3 text-sm">
                {#if submission.githubPrUrl}
                  <a
                    href={submission.githubPrUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="font-mono text-brand hover:underline"
                  >
                    View PR
                  </a>
                {/if}
              </div>
              {#if submission.reviewStatus === 'rejected' && submission.rejectionReason}
                <p class="mt-1 text-sm text-danger">
                  Rejected: {submission.rejectionReason}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- Your Payouts -->
    <Card>
      {#snippet header()}
        Your Payouts
      {/snippet}
      {#if myPayouts.length === 0}
        <EmptyState message="No payouts recorded." />
      {:else}
        <div class="divide-y divide-ink">
          {#each myPayouts as payout}
            <div class="border-b border-ink last:border-b-0 py-3 first:pt-0 last:pb-0 flex flex-wrap items-center gap-3">
              <span class="font-mono font-semibold">{payout.amountUsdc} USDC</span>
              <Badge variant={payoutVariant(payout.status)}>{payout.status}</Badge>
              <span class="text-sm text-muted">{payout.provider}</span>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
{/if}
