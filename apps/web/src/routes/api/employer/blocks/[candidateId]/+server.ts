import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, employerBlocks } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { writeAuditLog } from '$lib/server/audit';

export async function DELETE(event) {
  const employer = await requireRole(event, 'employer');

  await db
    .delete(employerBlocks)
    .where(and(eq(employerBlocks.employerId, employer.id), eq(employerBlocks.candidateId, event.params.candidateId)));

  await writeAuditLog('candidate.unblocked', {
    employerId: employer.id,
    candidateId: event.params.candidateId
  });

  return json({ ok: true });
}
