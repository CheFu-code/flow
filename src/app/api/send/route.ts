import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  applyVariables,
  renderEmailShell,
  textToHtml,
} from '@/lib/email-templates';
import { sendEmailSchema } from '@/lib/email-schema';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const parsed = sendEmailSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const limit = Number(process.env.FLOW_MAX_RECIPIENTS || 100);
  const recipients =
    payload.action === 'test'
      ? [
          {
            email: payload.testEmail || payload.recipients[0].email,
            firstName: 'Test',
            lastName: 'Recipient',
            company: 'Flow',
            tags: ['test'],
          },
        ]
      : payload.recipients.slice(0, limit);

  if (payload.action === 'campaign' && payload.recipients.length > limit) {
    return NextResponse.json(
      { error: `Audience exceeds FLOW_MAX_RECIPIENTS (${limit}).` },
      { status: 400 },
    );
  }

  const emails = recipients.map(recipient => {
    const variables = {
      audienceName: payload.audienceName,
      company: recipient.company || 'CheFu Academy',
      email: recipient.email,
      firstName: recipient.firstName || recipient.email.split('@')[0],
      lastName: recipient.lastName || '',
    };
    const subject = applyVariables(payload.subject, variables);
    const body = applyVariables(payload.html, variables);
    const html = renderEmailShell({
      body: textToHtml(body),
      ctaLabel: payload.ctaLabel || undefined,
      ctaUrl: payload.ctaUrl || undefined,
      preheader: payload.preheader,
      title: subject,
    });

    return {
      from: payload.from,
      to: [recipient.email],
      subject,
      html,
      replyTo: payload.replyTo || undefined,
      tags: [
        { name: 'app', value: 'flow' },
        { name: 'audience', value: payload.audienceName.slice(0, 40) },
        ...payload.tags.slice(0, 3).map(tag => ({
          name: 'tag',
          value: tag.slice(0, 40),
        })),
      ],
    };
  });

  const response =
    emails.length === 1
      ? await resend.emails.send(emails[0])
      : await resend.batch.send(emails, { batchValidation: 'permissive' });

  if (response.error) {
    return NextResponse.json(
      { error: response.error.message || 'Resend failed.', details: response.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    action: payload.action,
    audienceName: payload.audienceName,
    count: emails.length,
    data: response.data,
    sentAt: new Date().toISOString(),
  });
}
