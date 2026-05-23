import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    defaultFrom:
      process.env.FLOW_DEFAULT_FROM ||
      process.env.RESEND_FROM ||
      'Flow <onboarding@resend.dev>',
    defaultReplyTo: process.env.FLOW_DEFAULT_REPLY_TO || '',
    maxRecipients: Number(process.env.FLOW_MAX_RECIPIENTS || 100),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
  });
}
