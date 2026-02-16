import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(24),
  DATABASE_URL: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  GITHUB_APP_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_APP_INSTALLATION_ID: z.string().min(1),
  GITHUB_ORG: z.string().min(1),
  PUBLIC_PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  CIRCLE_API_KEY: z.string().min(1),
  CIRCLE_ENTITY_SECRET: z.string().min(1),
  CIRCLE_WEBHOOK_SECRET: z.string().min(1),
  BASE_RPC_URL: z.string().url(),
  BASE_CHAIN_ID: z.coerce.number().default(8453),
  USDC_ADDRESS: z.string().min(1),
  ESCROW_CONTRACT_ADDRESS: z.string().min(1),
  TREASURY_ADDRESS: z.string().min(1),
  QUEUE_DATABASE_URL: z.string().min(1).optional()
});

export type AppEnv = z.infer<typeof envSchema>;

let memoizedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (memoizedEnv) {
    return memoizedEnv;
  }

  memoizedEnv = envSchema.parse(process.env);
  return memoizedEnv;
}
