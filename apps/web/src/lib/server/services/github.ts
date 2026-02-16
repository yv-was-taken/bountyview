import { App } from '@octokit/app';
import { and, eq } from 'drizzle-orm';
import { db, githubAccessGrants, githubRepos } from '@bountyview/db';
import { getEnv } from '../env';

function buildGitHubApp() {
  const env = getEnv();

  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    webhooks: {
      secret: env.GITHUB_APP_WEBHOOK_SECRET
    }
  });
}

async function getInstallationClient() {
  const env = getEnv();
  const app = buildGitHubApp();

  return app.getInstallationOctokit(Number(env.GITHUB_APP_INSTALLATION_ID));
}

function candidateBranchName(githubUsername: string, candidateId: string) {
  return `candidate/${githubUsername}-${candidateId.slice(0, 8)}`;
}

export async function ensureBountyRepo(params: {
  bountyId: string;
  employerGithubUsername: string;
  repoTemplateUrl?: string | null;
}) {
  const existing = await db.query.githubRepos.findFirst({
    where: eq(githubRepos.bountyId, params.bountyId)
  });

  if (existing) {
    return existing;
  }

  const env = getEnv();
  const octokit = await getInstallationClient();
  const repoName = `bounty-${params.bountyId.slice(0, 8)}`;

  let createdRepo: { full_name: string; html_url: string };

  if (params.repoTemplateUrl) {
    const match = params.repoTemplateUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/i);
    if (!match) {
      throw new Error('Invalid template URL. Expected github.com/owner/repo');
    }

    const [, owner, repo] = match;
    const response = await octokit.request('POST /repos/{template_owner}/{template_repo}/generate', {
      template_owner: owner,
      template_repo: repo,
      owner: env.GITHUB_ORG,
      name: repoName,
      private: true,
      include_all_branches: false
    });

    createdRepo = {
      full_name: response.data.full_name,
      html_url: response.data.html_url
    };
  } else {
    const response = await octokit.request('POST /orgs/{org}/repos', {
      org: env.GITHUB_ORG,
      name: repoName,
      private: true,
      has_issues: false,
      has_projects: false,
      has_wiki: false,
      auto_init: true,
      description: `BountyView interview repo for bounty ${params.bountyId}`
    });

    createdRepo = {
      full_name: response.data.full_name,
      html_url: response.data.html_url
    };
  }

  const inserted = await db
    .insert(githubRepos)
    .values({
      bountyId: params.bountyId,
      repoFullName: createdRepo.full_name,
      repoUrl: createdRepo.html_url,
      ownerType: 'org'
    })
    .returning();

  return inserted[0];
}

export async function grantCandidateRepoAccess(params: {
  bountyId: string;
  candidateId: string;
  candidateGithubUsername: string;
}) {
  const repo = await db.query.githubRepos.findFirst({ where: eq(githubRepos.bountyId, params.bountyId) });
  if (!repo) {
    throw new Error('Repository not provisioned for bounty');
  }

  const [owner, repoName] = repo.repoFullName.split('/');
  if (!owner || !repoName) {
    throw new Error('Invalid repo full name');
  }

  const octokit = await getInstallationClient();

  await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
    owner,
    repo: repoName,
    username: params.candidateGithubUsername,
    permission: 'push'
  });

  const branchName = candidateBranchName(params.candidateGithubUsername, params.candidateId);

  const currentGrant = await db.query.githubAccessGrants.findFirst({
    where: and(
      eq(githubAccessGrants.bountyId, params.bountyId),
      eq(githubAccessGrants.candidateId, params.candidateId)
    )
  });

  if (!currentGrant) {
    await db.insert(githubAccessGrants).values({
      bountyId: params.bountyId,
      candidateId: params.candidateId,
      branchName,
      permission: 'push'
    });
  }

  return { branchName, repoUrl: repo.repoUrl, repoFullName: repo.repoFullName };
}

export async function revokeCandidateRepoAccess(params: {
  bountyId: string;
  candidateId: string;
  candidateGithubUsername: string;
}) {
  const repo = await db.query.githubRepos.findFirst({ where: eq(githubRepos.bountyId, params.bountyId) });
  if (!repo) {
    return;
  }

  const [owner, repoName] = repo.repoFullName.split('/');
  if (!owner || !repoName) {
    return;
  }

  const octokit = await getInstallationClient();

  await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
    owner,
    repo: repoName,
    username: params.candidateGithubUsername
  });

  await db
    .update(githubAccessGrants)
    .set({
      revokedAt: new Date()
    })
    .where(
      and(
        eq(githubAccessGrants.bountyId, params.bountyId),
        eq(githubAccessGrants.candidateId, params.candidateId)
      )
    );
}

export async function getPullRequestArtifacts(prUrl: string) {
  const match = prUrl.match(/github\.com\/(.+?)\/(.+?)\/pull\/(\d+)/i);
  if (!match) {
    throw new Error('Invalid GitHub PR URL');
  }

  const [, owner, repo, pullNumberRaw] = match;
  const pullNumber = Number(pullNumberRaw);

  const octokit = await getInstallationClient();
  const prResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: pullNumber
  });

  const commitResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
    owner,
    repo,
    pull_number: pullNumber
  });

  return {
    title: prResponse.data.title,
    body: prResponse.data.body,
    state: prResponse.data.state,
    merged: prResponse.data.merged,
    commits: commitResponse.data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      authorName: commit.commit.author?.name,
      committedAt: commit.commit.author?.date
    }))
  };
}
