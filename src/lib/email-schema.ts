import { z } from 'zod';

export const recipientSchema = z.object({
  email: z.email(),
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  company: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export const sendEmailSchema = z.object({
  action: z.enum(['test', 'campaign']).default('test'),
  audienceName: z.string().min(1).max(80).default('Manual audience'),
  ctaLabel: z.string().max(80).optional().default(''),
  ctaUrl: z.url().or(z.literal('')).optional().default(''),
  from: z.string().min(3),
  html: z.string().min(20),
  preheader: z.string().max(180).optional().default(''),
  recipients: z.array(recipientSchema).min(1).max(100),
  replyTo: z.email().or(z.literal('')).optional().default(''),
  subject: z.string().min(2).max(140),
  tags: z.array(z.string()).optional().default([]),
  testEmail: z.email().or(z.literal('')).optional().default(''),
});

export type FlowRecipient = z.infer<typeof recipientSchema>;
export type SendEmailPayload = z.infer<typeof sendEmailSchema>;
