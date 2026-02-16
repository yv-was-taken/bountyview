import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  QUEUE_DATABASE_URL: z.string().optional(),
  BASE_RPC_URL: z.string().url(),
  ESCROW_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  GITHUB_APP_INSTALLATION_ID: z.string().min(1),
  CIRCLE_API_KEY: z.string().min(1)
});

export const env = schema.parse(process.env);
