# Flow Mail

Flow Mail is CheFu Inc's standalone email client. The Next.js app provides the mailbox and compose UI; the Nest backend owns all sending, receiving, Resend keys, webhook verification, and Firestore storage.

## Local Environment

`flow/.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FLOW_API_KEY=
FLOW_ACCESS_SECRET=flow-local-development-secret
```

Backend `.env`:

```bash
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
FLOW_API_KEY=
FLOW_ACCESS_SECRET=flow-local-development-secret
FLOW_DEFAULT_FROM="Flow Mail <mail@flow.chefuinc.com>"
FLOW_SENDERS="CheFu Inc <hello@chefuinc.com>;Flow Mail <mail@flow.chefuinc.com>;Support <support@chefuinc.com>;Security <security@chefuinc.com>;Muzalo <muzalo@chefuinc.com>;CheFu Academy <academy@chefuinc.com>;CheFu Quantum <quantum@chefuinc.com>"
FLOW_DEFAULT_REPLY_TO="reply@chefuinc.com"
FLOW_INBOUND_ADDRESS=support@chefuinc.com
FLOW_MAX_RECIPIENTS=100
FRONTEND_ORIGINS=https://academy.chefuinc.com,https://flow.chefuinc.com
```

If `FLOW_API_KEY` is set on the backend, `NEXT_PUBLIC_FLOW_API_KEY` must match it.
`FLOW_ACCESS_SECRET` must also match on both apps because the backend signs the
Flow access cookie and the Next.js proxy verifies it before rendering protected
pages.

## Access Keys

Employees do not create their own Flow keys. A backend admin creates a key,
copies the generated value once, and gives it to the employee.

```bash
POST /flow/admin/access-keys
Authorization: Bearer <admin token>
Content-Type: application/json

{
  "label": "Marketing team",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

The response includes `accessKey` one time. The backend stores only its hash.
Employees then enter that key on `/login` or `/register`; `/register` is now an
activation screen, not a public key-creation screen.

## Resend Setup

1. Add and verify the sending domain in Resend.
   Use `chefuinc.com` if you want senders such as `support@chefuinc.com`, `security@chefuinc.com`, `muzalo@chefuinc.com`, and `hello@chefuinc.com`.

2. Add the DNS records Resend gives you.
   This usually includes SPF/DKIM-style records for sending. Wait until Resend marks the domain as verified.

3. Add inbound receiving for the address you want to test, for example:

   ```txt
   support@chefuinc.com
   ```

4. Enable tracking metrics for your sending domain if you want Flow to show
   whether sent emails were opened. Resend requires open tracking and a verified
   tracking subdomain before it can emit open events.

5. In Resend, create a webhook endpoint for received emails and tracking events:

   ```txt
   https://YOUR_BACKEND_DOMAIN/flow/inbound
   ```

   Subscribe it to `email.received`, `email.opened`, `email.delivered`,
   `email.clicked`, `email.bounced`, and `email.failed`.

6. Copy the webhook signing secret from Resend and paste it into backend env:

   ```bash
   RESEND_WEBHOOK_SECRET=...
   ```

7. Set backend sender identities:

   ```bash
   FLOW_SENDERS="CheFu Inc <hello@chefuinc.com>;Flow Mail <mail@flow.chefuinc.com>;Support <support@chefuinc.com>;Security <security@chefuinc.com>;Muzalo <muzalo@chefuinc.com>;CheFu Academy <academy@chefuinc.com>;CheFu Quantum <quantum@chefuinc.com>"
   ```

   Flow only allows sending from identities in this list.

8. Deploy/restart the backend, then deploy/restart Flow.

9. Send a test email from Gmail to:

   ```txt
   support@chefuinc.com
   ```

   It should appear in Flow's Inbox after Resend posts the inbound webhook.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
