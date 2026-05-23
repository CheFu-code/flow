# Flow

Flow is a professional email command center for CheFu-style user messaging. It is a standalone Next.js frontend app. The actual email APIs live in the existing Nest backend and use Resend there.

## Features

- Campaign composer with subject, preheader, body, CTA, reply-to, and sender controls
- Professional email shell rendered server-side before sending
- Resend test send and campaign send through the backend `/flow` API
- Batch campaign sending with permissive validation
- Template library for welcome, course reminder, weekly progress, and announcements
- CSV recipient import
- Variable replacement such as `{{firstName}}`, `{{courseName}}`, and `{{company}}`
- Live inbox preview
- Local delivery history
- Resend connection health indicator

## Environment

Create `flow/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FLOW_API_KEY=
```

Set these in the backend environment:

```bash
RESEND_API_KEY=
FLOW_API_KEY=
FLOW_DEFAULT_FROM="Flow <onboarding@resend.dev>"
FLOW_DEFAULT_REPLY_TO=
FLOW_MAX_RECIPIENTS=100
```

Use a verified Resend sender/domain for real campaigns. `onboarding@resend.dev` is only suitable for testing. If `FLOW_API_KEY` is set in the backend, `NEXT_PUBLIC_FLOW_API_KEY` must match it.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API

`GET /flow/config`

Returns sender defaults, send limits, and whether Resend is configured.

`POST /flow/send`

Sends either a test email or a campaign:

```json
{
  "action": "test",
  "audienceName": "CheFu learners",
  "from": "Flow <hello@example.com>",
  "replyTo": "support@example.com",
  "subject": "Welcome {{firstName}}",
  "preheader": "A useful update",
  "html": "Hi {{firstName}}, welcome.",
  "recipients": [{ "email": "learner@example.com", "firstName": "Learner" }],
  "testEmail": "you@example.com"
}
```
