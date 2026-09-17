# Staff invitation email operations

The API sends staff invitations through the `ConfiguredStaffMailer` adapter.
Development and tests may use `EMAIL_PROVIDER=console`; production may use
the Gmail API over HTTPS/443 or Resend. The legacy `gmail` SMTP provider and
the SMTP variables are deprecated and are not used by `gmail-api`.

## Production setup

1. In Google Cloud, configure OAuth for the sender account with the scope
   `https://www.googleapis.com/auth/gmail.send`; the refresh token belongs to
   that sender account.
2. Set `EMAIL_PROVIDER=gmail-api`, `EMAIL_FROM`, `EMAIL_FROM_NAME` (optional),
   `GMAIL_API_CLIENT_ID`, `GMAIL_API_CLIENT_SECRET`, and
   `GMAIL_API_REFRESH_TOKEN` in Railway secrets only. Secrets are never
   committed, logged, or returned by an API response. Resend remains available
   with `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`.
4. Set `WEB_PUBLIC_URL` to the canonical HTTPS application URL. Invitation
   links are generated as `${WEB_PUBLIC_URL}/invite/{raw-token}`.
5. Deploy the API and send a controlled test invitation. Confirm the email,
   claim, audit event, and `ACCEPTED` status before enabling broad onboarding.

The API environment schema fails production startup when Resend configuration
is incomplete. Delivery failures do not provision a user or membership; the
invitation is marked `DELIVERY_FAILED` and can be safely resent, which revokes
the previous pending token and creates a fresh one.

## Incident and rollback notes

Rotate the Resend key in the provider and deployment secret manager if it is
exposed. Do not update invitation tokens manually in PostgreSQL. Roll back the
application only through the normal deployment pipeline; preserve invitation
and audit rows and use a forward migration for data corrections.
