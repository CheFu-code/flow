# Flow Mail

Flow Mail is CheFu Inc's standalone email client. The Next.js app provides the mailbox and compose UI; the Nest backend owns all sending, receiving, Resend keys, webhook verification, and Firestore storage.

## Local Environment

`flow/.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FLOW_API_KEY=
```

Backend `.env`:

```bash
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
FLOW_API_KEY=
FLOW_DEFAULT_FROM="Flow Mail <mail@flow.chefuinc.com>"
FLOW_SENDERS="CheFu Inc <hello@chefuinc.com>;Flow Mail <mail@flow.chefuinc.com>;Support <support@chefuinc.com>;Security <security@chefuinc.com>"
FLOW_DEFAULT_REPLY_TO="reply@flow.chefuinc.com"
FLOW_INBOUND_ADDRESS=support@chefuinc.com
FLOW_MAX_RECIPIENTS=100
FRONTEND_ORIGINS=https://academy.chefuinc.com,https://flow.chefuinc.com
```

If `FLOW_API_KEY` is set on the backend, `NEXT_PUBLIC_FLOW_API_KEY` must match it.

## Resend Setup

1. Add and verify the sending domain in Resend.
   Use `chefuinc.com` if you want senders such as `support@chefuinc.com`, `security@chefuinc.com`, and `hello@chefuinc.com`.

2. Add the DNS records Resend gives you.
   This usually includes SPF/DKIM-style records for sending. Wait until Resend marks the domain as verified.

3. Add inbound receiving for the address you want to test, for example:

   ```txt
   support@chefuinc.com
   ```

4. In Resend, create a webhook endpoint for received emails:

   ```txt
   https://YOUR_BACKEND_DOMAIN/flow/inbound
   ```

   Subscribe it to the email received event.

5. Copy the webhook signing secret from Resend and paste it into backend env:

   ```bash
   RESEND_WEBHOOK_SECRET=...
   ```

6. Set backend sender identities:

   ```bash
   FLOW_SENDERS="CheFu Inc <hello@chefuinc.com>;Support <support@chefuinc.com>;Security <security@chefuinc.com>"
   ```

   Flow only allows sending from identities in this list.

7. Deploy/restart the backend, then deploy/restart Flow.

8. Send a test email from Gmail to:

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
