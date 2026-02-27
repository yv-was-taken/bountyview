import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'noreply@bountyview.com';

interface EmailContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: content.subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: content.textBody, Charset: 'UTF-8' },
        Html: { Data: content.htmlBody, Charset: 'UTF-8' }
      }
    }
  });

  await ses.send(command);
}
