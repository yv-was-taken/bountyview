import { App } from '@octokit/app';
import { env } from '../env';

function getOctokit() {
  const app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
  });

  return app.getInstallationOctokit(Number(env.GITHUB_APP_INSTALLATION_ID));
}

export async function revokeCollaborator(repoFullName: string, githubUsername: string) {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repo name: ${repoFullName}`);
  }

  const octokit = await getOctokit();

  await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
    owner,
    repo,
    username: githubUsername
  });
}
