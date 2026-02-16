import { and, eq } from 'drizzle-orm';
import { db, githubAccessGrants, githubRepos } from '@bountyview/db';
import { revokeCollaborator } from '../services/github';
import type { GithubAccessRevokePayload } from './types';

export async function revokeGithubAccess(payload: GithubAccessRevokePayload) {
  const repo = await db.query.githubRepos.findFirst({ where: eq(githubRepos.bountyId, payload.bountyId) });
  if (!repo) {
    return;
  }

  await revokeCollaborator(repo.repoFullName, payload.candidateGithubUsername);

  await db
    .update(githubAccessGrants)
    .set({
      revokedAt: new Date()
    })
    .where(and(eq(githubAccessGrants.bountyId, payload.bountyId), eq(githubAccessGrants.candidateId, payload.candidateId)));
}
