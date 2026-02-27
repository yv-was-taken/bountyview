import type { SendEmailPayload } from './types';
import { sendEmail } from '../services/email';
import { templates } from '../services/email-templates';

export async function handleSendEmail(payload: SendEmailPayload) {
  const template = templates[payload.template];
  if (!template) {
    console.error(`[send_email] Unknown template: ${payload.template}`);
    return;
  }

  const content = template(payload.data);
  await sendEmail(payload.to, content);
  console.info(`[send_email] Sent ${payload.template} to ${payload.to}`);
}
