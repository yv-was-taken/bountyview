import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { notFound, forbidden } from '$lib/server/http';
import { listEmployerSubmissions } from '@bountyview/db';
import { getPullRequestArtifacts } from '$lib/server/services/github';

export async function GET(event) {
  const employer = await requireRole(event, 'employer');

  const bounty = await db.query.bounties.findFirst({
    where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
  });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.employerId !== employer.id) {
    return forbidden();
  }

  const submissions = await listEmployerSubmissions(employer.id, bounty.id);

  const includeArtifacts = event.url.searchParams.get('includeArtifacts') === '1';

  if (!includeArtifacts) {
    return json({ submissions });
  }

  const enriched = await Promise.all(
    submissions.map(async (submission) => {
      try {
        const artifacts = await getPullRequestArtifacts(submission.githubPrUrl);
        return {
          ...submission,
          artifacts
        };
      } catch {
        return submission;
      }
    })
  );

  return json({ submissions: enriched });
}
