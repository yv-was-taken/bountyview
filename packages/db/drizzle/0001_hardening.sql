ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'submissions_review_status_check'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_review_status_check
      CHECK (review_status IN ('pending', 'rejected', 'winner'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM bounty_funding
    GROUP BY lower(tx_hash)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize tx_hash: duplicates differ only by casing';
  END IF;
END $$;

UPDATE bounty_funding
SET tx_hash = lower(tx_hash)
WHERE tx_hash <> lower(tx_hash);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bounty_funding_tx_hash_lower_check'
  ) THEN
    ALTER TABLE bounty_funding
      ADD CONSTRAINT bounty_funding_tx_hash_lower_check
      CHECK (tx_hash = lower(tx_hash));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'submissions_winner_consistency_check'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_winner_consistency_check
      CHECK ((review_status = 'winner') = is_winner);
  END IF;
END $$;
