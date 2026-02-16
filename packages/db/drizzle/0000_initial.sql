CREATE TABLE "bounties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onchain_bounty_id" varchar(78),
	"employer_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"job_title" text NOT NULL,
	"role_level" text NOT NULL,
	"task_description" text NOT NULL,
	"task_source" text NOT NULL,
	"template_id" uuid,
	"repo_template_url" text,
	"deliverables" jsonb NOT NULL,
	"bounty_amount_usdc" numeric(18, 6) NOT NULL,
	"submission_deadline" timestamp with time zone NOT NULL,
	"grace_period_days" integer DEFAULT 7 NOT NULL,
	"what_happens_after" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounties_onchain_bounty_id_unique" UNIQUE("onchain_bounty_id"),
	CONSTRAINT "bounties_role_level_check" CHECK ("bounties"."role_level" in ('junior', 'mid', 'senior', 'staff', 'lead')),
	CONSTRAINT "bounties_task_source_check" CHECK ("bounties"."task_source" in ('custom', 'template')),
	CONSTRAINT "bounties_status_check" CHECK ("bounties"."status" in ('open', 'claimed', 'cancelled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "bounty_funding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"chain_id" integer NOT NULL,
	"escrow_amount" numeric(18, 6) NOT NULL,
	"funded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounty_funding_bounty_id_unique" UNIQUE("bounty_id"),
	CONSTRAINT "bounty_funding_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "bounty_funding_tx_hash_lower_check" CHECK ("bounty_funding"."tx_hash" = lower("bounty_funding"."tx_hash"))
);
--> statement-breakpoint
CREATE TABLE "bounty_tags" (
	"bounty_id" uuid NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "bounty_tags_bounty_id_tag_pk" PRIMARY KEY("bounty_id","tag")
);
--> statement-breakpoint
CREATE TABLE "bounty_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"role_level" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"repo_template_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_blocks_unique" UNIQUE("employer_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "escrow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onchain_bounty_id" varchar(78) NOT NULL,
	"event_type" text NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" varchar(78) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escrow_events_unique" UNIQUE("tx_hash","event_type")
);
--> statement-breakpoint
CREATE TABLE "github_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"branch_name" text NOT NULL,
	"permission" text DEFAULT 'push' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_access_grants_unique" UNIQUE("bounty_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "github_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_url" text NOT NULL,
	"owner_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_repos_bounty_id_unique" UNIQUE("bounty_id"),
	CONSTRAINT "github_repos_repo_full_name_unique" UNIQUE("repo_full_name")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" text NOT NULL,
	"status" text NOT NULL,
	"payload" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"candidate_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_usdc" numeric(18, 6) NOT NULL,
	"external_ref" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_provider_check" CHECK ("payouts"."provider" in ('circle', 'self_service')),
	CONSTRAINT "payouts_status_check" CHECK ("payouts"."status" in ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"github_repo_url" text NOT NULL,
	"github_pr_url" text NOT NULL,
	"custom_deliverables" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_bounty_candidate_unique" UNIQUE("bounty_id","candidate_id"),
	CONSTRAINT "submissions_review_status_check" CHECK ("submissions"."review_status" in ('pending', 'rejected', 'winner')),
	CONSTRAINT "submissions_winner_consistency_check" CHECK (("submissions"."review_status" = 'winner') = "submissions"."is_winner")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" varchar(32) NOT NULL,
	"github_username" text NOT NULL,
	"avatar_url" text,
	"role" text NOT NULL,
	"company_id" uuid,
	"privy_wallet_address" varchar(42),
	"terms_accepted_at" timestamp with time zone,
	"terms_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('employer', 'candidate'))
);
--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_template_id_bounty_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bounty_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_funding" ADD CONSTRAINT "bounty_funding_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_tags" ADD CONSTRAINT "bounty_tags_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_blocks" ADD CONSTRAINT "employer_blocks_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_blocks" ADD CONSTRAINT "employer_blocks_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_access_grants" ADD CONSTRAINT "github_access_grants_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_access_grants" ADD CONSTRAINT "github_access_grants_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bounties_status_idx" ON "bounties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bounties_deadline_idx" ON "bounties" USING btree ("submission_deadline");--> statement-breakpoint
CREATE INDEX "employer_blocks_employer_idx" ON "employer_blocks" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "employer_blocks_candidate_idx" ON "employer_blocks" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "escrow_events_onchain_idx" ON "escrow_events" USING btree ("onchain_bounty_id");--> statement-breakpoint
CREATE INDEX "github_access_grants_candidate_idx" ON "github_access_grants" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "payouts_candidate_idx" ON "payouts" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "submissions_bounty_idx" ON "submissions" USING btree ("bounty_id");--> statement-breakpoint
CREATE INDEX "submissions_candidate_idx" ON "submissions" USING btree ("candidate_id");