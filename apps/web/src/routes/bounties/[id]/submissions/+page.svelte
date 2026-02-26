<script lang="ts">
  import { Button, Card, Badge, Input, Modal, EmptyState, toast } from '$lib/components';

  const { data } = $props();

  let modalOpen = $state(false);
  let selectedSubmissionId = $state('');
  let winnerAddress = $state('');
  let txHash = $state('');
  let loading = $state(false);

  function openModal(submissionId: string) {
    selectedSubmissionId = submissionId;
    winnerAddress = '';
    txHash = '';
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    selectedSubmissionId = '';
    winnerAddress = '';
    txHash = '';
  }

  async function confirmWinner() {
    if (!winnerAddress || !txHash) {
      toast.error('Both wallet address and transaction hash are required');
      return;
    }

    loading = true;
    try {
      const res = await fetch(`/api/bounties/${data.bountyId}/claim-winner`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmissionId,
          winnerAddress,
          txHash
        })
      });

      const body = await res.json();

      if (res.ok) {
        toast.success('Winner selected and payout initiated.');
        closeModal();
      } else {
        toast.error(body.error ?? 'Failed to select winner');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      loading = false;
    }
  }

  function statusVariant(status: string, isWinner: boolean): 'default' | 'success' | 'danger' {
    if (isWinner) return 'success';
    if (status === 'rejected') return 'danger';
    return 'default';
  }
</script>

<h1 class="font-mono text-2xl font-bold mb-6">Submissions</h1>

{#if data.submissions.length === 0}
  <EmptyState message="No submissions yet." />
{:else}
  <div class="flex flex-col gap-4">
    {#each data.submissions as submission}
      <Card>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-lg font-semibold">{submission.candidateGithubUsername}</span>
            <Badge variant={statusVariant(submission.reviewStatus, submission.isWinner)}>
              {#if submission.isWinner}
                Winner
              {:else}
                {submission.reviewStatus}
              {/if}
            </Badge>
          </div>

          <div class="flex gap-4 font-mono text-sm">
            <a
              href={submission.githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              class="text-brand underline hover:no-underline"
            >
              Repository
            </a>
            <a
              href={submission.githubPrUrl}
              target="_blank"
              rel="noreferrer"
              class="text-brand underline hover:no-underline"
            >
              Pull Request
            </a>
          </div>

          <p class="font-mono text-xs text-muted">
            Submitted {new Date(submission.submittedAt).toLocaleDateString()}
          </p>

          {#if submission.reviewStatus === 'rejected' && submission.rejectionReason}
            <p class="font-mono text-xs text-danger">Reason: {submission.rejectionReason}</p>
          {/if}

          {#if !submission.isWinner}
            <div class="pt-1">
              <Button variant="secondary" onclick={() => openModal(submission.id)}>
                Select Winner
              </Button>
            </div>
          {/if}
        </div>
      </Card>
    {/each}
  </div>
{/if}

<Modal open={modalOpen} title="Select Winner" onclose={closeModal}>
  <div class="flex flex-col gap-4">
    <Input
      label="Winner Wallet Address"
      type="text"
      placeholder="0x..."
      value={winnerAddress}
      oninput={(e: Event & { currentTarget: HTMLInputElement }) => (winnerAddress = e.currentTarget.value)}
    />
    <Input
      label="Claim Transaction Hash"
      type="text"
      placeholder="0x..."
      value={txHash}
      oninput={(e: Event & { currentTarget: HTMLInputElement }) => (txHash = e.currentTarget.value)}
    />
  </div>

  {#snippet actions()}
    <Button variant="secondary" onclick={closeModal}>Cancel</Button>
    <Button {loading} onclick={confirmWinner}>Confirm Winner</Button>
  {/snippet}
</Modal>
