export async function provisionGithubRepo(payload: Record<string, unknown>) {
  // Repo provisioning is currently handled synchronously in the API claim path.
  // Keep this worker slot for async provisioning rollout without changing queue contracts.
  console.info('[github_repo_provision]', payload);
}
