import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, bountyTags, companies, db, users } from '@bountyview/db';
import { createBountyInputSchema } from '@bountyview/shared';
import { listOpenBounties } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { writeAuditLog } from '$lib/server/audit';

export async function GET({ url }) {
  const level = url.searchParams.get('level') ?? undefined;
  const minAmount = url.searchParams.get('minAmount');
  const maxAmount = url.searchParams.get('maxAmount');
  const tags =
    url.searchParams
      .get('tags')
      ?.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean) ?? undefined;

  const records = await listOpenBounties({
    level: level as 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    tags
  });

  return json({ bounties: records });
}

export async function POST(event) {
  const employer = await requireRole(event, 'employer');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = createBountyInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid bounty payload', parsed.error.flatten());
  }

  try {
    const result = await db.transaction(async (tx) => {
      let companyId = employer.companyId;

      if (!companyId) {
        const existingCompany = await tx.query.companies.findFirst({
          where: eq(companies.name, parsed.data.companyName)
        });

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const insertedCompany = await tx
            .insert(companies)
            .values({
              name: parsed.data.companyName,
              description: parsed.data.companyDescription ?? null
            })
            .returning({ id: companies.id });

          companyId = insertedCompany[0]?.id ?? null;
        }

        if (!companyId) {
          throw new Error('Unable to resolve company');
        }

        await tx
          .update(users)
          .set({
            companyId,
            updatedAt: new Date()
          })
          .where(eq(users.id, employer.id));
      }

      const inserted = await tx
        .insert(bounties)
        .values({
          employerId: employer.id,
          companyId,
          jobTitle: parsed.data.jobTitle,
          roleLevel: parsed.data.roleLevel,
          taskDescription: parsed.data.taskDescription,
          taskSource: parsed.data.taskSource,
          templateId: parsed.data.templateId ?? null,
          repoTemplateUrl: parsed.data.repoTemplateUrl ?? null,
          deliverables: parsed.data.deliverables,
          bountyAmountUsdc: parsed.data.bountyAmountUsdc.toFixed(6),
          submissionDeadline: parsed.data.submissionDeadline,
          gracePeriodDays: parsed.data.gracePeriodDays,
          whatHappensAfter: parsed.data.whatHappensAfter,
          status: 'open'
        })
        .returning({ id: bounties.id });

      const bounty = inserted[0];
      if (!bounty) {
        throw new Error('Failed to insert bounty');
      }

      await tx.insert(bountyTags).values(
        parsed.data.techStackTags.map((tag) => ({
          bountyId: bounty.id,
          tag
        }))
      );

      return bounty;
    });

    await writeAuditLog('bounty.created', {
      employerId: employer.id,
      bountyId: result.id
    });

    return json({ bounty: result }, { status: 201 });
  } catch (err) {
    console.error('Failed to create bounty', err);
    return serverError('Failed to create bounty');
  }
}
