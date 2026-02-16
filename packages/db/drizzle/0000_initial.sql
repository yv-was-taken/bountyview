CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id VARCHAR(32) UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('employer', 'candidate')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  privy_wallet_address VARCHAR(42),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bounty_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role_level TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  repo_template_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_bounty_id VARCHAR(78) UNIQUE,
  employer_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  job_title TEXT NOT NULL,
  role_level TEXT NOT NULL CHECK (role_level IN ('junior', 'mid', 'senior', 'staff', 'lead')),
  task_description TEXT NOT NULL,
  task_source TEXT NOT NULL CHECK (task_source IN ('custom', 'template')),
  template_id UUID REFERENCES bounty_templates(id) ON DELETE SET NULL,
  repo_template_url TEXT,
  deliverables JSONB NOT NULL,
  bounty_amount_usdc NUMERIC(18,6) NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  what_happens_after TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bounties_status_idx ON bounties(status);
CREATE INDEX IF NOT EXISTS bounties_deadline_idx ON bounties(submission_deadline);

CREATE TABLE IF NOT EXISTS bounty_tags (
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (bounty_id, tag)
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_url TEXT NOT NULL,
  github_pr_url TEXT NOT NULL,
  custom_deliverables JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bounty_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS submissions_bounty_idx ON submissions(bounty_id);
CREATE INDEX IF NOT EXISTS submissions_candidate_idx ON submissions(candidate_id);

CREATE TABLE IF NOT EXISTS employer_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employer_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS employer_blocks_employer_idx ON employer_blocks(employer_id);
CREATE INDEX IF NOT EXISTS employer_blocks_candidate_idx ON employer_blocks(candidate_id);

CREATE TABLE IF NOT EXISTS bounty_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL UNIQUE REFERENCES bounties(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  escrow_amount NUMERIC(18,6) NOT NULL,
  funded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_bounty_id VARCHAR(78) NOT NULL,
  event_type TEXT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  block_number VARCHAR(78) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tx_hash, event_type)
);

CREATE INDEX IF NOT EXISTS escrow_events_onchain_idx ON escrow_events(onchain_bounty_id);

CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL UNIQUE REFERENCES bounties(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL UNIQUE,
  repo_url TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'push',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bounty_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS github_access_grants_candidate_idx ON github_access_grants(candidate_id);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('circle', 'self_service')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  amount_usdc NUMERIC(18,6) NOT NULL,
  external_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payouts_candidate_idx ON payouts(candidate_id);

CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
