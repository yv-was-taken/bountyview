import { QUEUE_NAMES } from '@bountyview/shared';
import { createWorkerQueue } from './services/queue';
import { syncEscrowEvents } from './jobs/syncEscrowEvents';
import { reconcileBountyState } from './jobs/reconcileBountyState';
import { revokeGithubAccess } from './jobs/revokeGithubAccess';
import { pollCircleWithdraw } from './jobs/pollCircleWithdraw';
import { retryFailedIntegrations } from './jobs/retryFailedIntegrations';
import { provisionGithubRepo } from './jobs/provisionGithubRepo';
import { recoverOrphanedPayouts } from './jobs/recoverOrphanedPayouts';
import { handleSendEmail } from './jobs/sendEmail';
import type { SendEmailPayload } from './jobs/types';

async function main() {
  const queue = await createWorkerQueue();

  await queue.work(QUEUE_NAMES.syncEscrowEvents, async (job) => {
    await syncEscrowEvents(job.data as { fromBlock?: string; toBlock?: string });
  });

  await queue.work(QUEUE_NAMES.reconcileBountyState, async (job) => {
    await reconcileBountyState(job.data as { nowIso?: string });
  });

  await queue.work(QUEUE_NAMES.githubAccessRevoke, async (job) => {
    await revokeGithubAccess(job.data as { bountyId: string; candidateId: string; candidateGithubUsername: string });
  });

  await queue.work(QUEUE_NAMES.githubRepoProvision, async (job) => {
    await provisionGithubRepo(job.data as Record<string, unknown>);
  });

  await queue.work(QUEUE_NAMES.circleWithdrawStatusPoll, async (job) => {
    await pollCircleWithdraw(job.data as { payoutId: string; externalRef: string });
  });

  await queue.work(QUEUE_NAMES.retryFailedIntegrations, async (job) => {
    await retryFailedIntegrations(job.data as Record<string, unknown>);
  });

  await queue.work(QUEUE_NAMES.recoverOrphanedPayouts, async () => {
    await recoverOrphanedPayouts();
  });

  await queue.work(QUEUE_NAMES.sendEmail, async (job) => {
    await handleSendEmail(job.data as SendEmailPayload);
  });

  await queue.schedule(QUEUE_NAMES.syncEscrowEvents, '*/2 * * * *', { trigger: 'cron' });
  await queue.schedule(QUEUE_NAMES.reconcileBountyState, '*/15 * * * *', { trigger: 'cron' });
  await queue.schedule(QUEUE_NAMES.recoverOrphanedPayouts, '*/5 * * * *', { trigger: 'cron' });

  console.info('BountyView worker started');
}

main().catch((err) => {
  console.error('Worker crashed', err);
  process.exit(1);
});
