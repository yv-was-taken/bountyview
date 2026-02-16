import { z } from 'zod';
import {
  BOUNTY_STATUS_VALUES,
  CIRCLE_PAYOUT_STATUS_VALUES,
  DELIVERABLE_TYPE_VALUES,
  ROLE_LEVEL_VALUES,
  ROLE_VALUES,
  TASK_SOURCE_VALUES
} from './types';

export const roleSchema = z.enum(ROLE_VALUES);
export const roleLevelSchema = z.enum(ROLE_LEVEL_VALUES);
export const taskSourceSchema = z.enum(TASK_SOURCE_VALUES);
export const bountyStatusSchema = z.enum(BOUNTY_STATUS_VALUES);
export const deliverableTypeSchema = z.enum(DELIVERABLE_TYPE_VALUES);
export const circlePayoutStatusSchema = z.enum(CIRCLE_PAYOUT_STATUS_VALUES);

export const deliverableItemSchema = z.object({
  type: deliverableTypeSchema,
  label: z.string().min(1),
  description: z.string().optional()
});

export const createBountyInputSchema = z.object({
  jobTitle: z.string().min(1),
  roleLevel: roleLevelSchema,
  companyName: z.string().min(1),
  companyDescription: z.string().optional(),
  techStackTags: z.array(z.string().min(1)).min(1),
  taskDescription: z.string().min(1),
  taskSource: taskSourceSchema,
  templateId: z.string().uuid().optional(),
  repoTemplateUrl: z.string().url().optional(),
  deliverables: z.array(deliverableItemSchema).min(1),
  bountyAmountUsdc: z.number().positive(),
  submissionDeadline: z.coerce.date(),
  gracePeriodDays: z.number().int().min(1).max(30).default(7),
  whatHappensAfter: z.string().min(1)
});

export const claimWinnerInputSchema = z.object({
  submissionId: z.string().uuid(),
  winnerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export const submitBountyInputSchema = z.object({
  githubRepoUrl: z.string().url(),
  githubPrUrl: z.string().url(),
  customDeliverables: z.array(
    z.object({
      label: z.string().min(1),
      url: z.string().url().optional(),
      note: z.string().optional()
    })
  ).optional()
});

export const employerBlockInputSchema = z.object({
  candidateId: z.string().uuid(),
  reason: z.string().min(3).max(500)
});

export const circleWithdrawInputSchema = z.object({
  amountUsdc: z.number().positive(),
  bankAccountId: z.string().min(1),
  destinationCurrency: z.string().min(3).max(3).default('USD')
});
