import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import MailComposer from 'nodemailer/lib/mail-composer';

export const STAFF_MAILER = Symbol('STAFF_MAILER');

export type StaffInvitationEmail = {
  to: string;
  organizationName: string;
  firstName: string;
  role: string;
  token: string;
  expiresAt: Date;
};

export interface StaffMailer {
  sendInvitation(input: StaffInvitationEmail): Promise<void>;
}

@Injectable()
export class ConfiguredStaffMailer implements StaffMailer {
  async sendInvitation(input: StaffInvitationEmail): Promise<void> {
    const provider = process.env.EMAIL_PROVIDER ?? 'console';
    const url = `${(process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/invite/${input.token}`;
    const subject = `Вас запрошено до RehabMIS — ${input.organizationName}`;
    const text = `Вітаємо, ${input.firstName}!\n\nВас запрошено до ${input.organizationName} у ролі ${input.role}.\nПрийняти запрошення: ${url}\nЗапрошення дійсне до ${input.expiresAt.toISOString()}.\n`;

    if (provider === 'console') {
      if (process.env.DEPLOYMENT_ENV === 'production') {
        throw new ServiceUnavailableException('Production email provider is not configured.');
      }
      console.info('Staff invitation email prepared', { to: input.to, subject });
      return;
    }
    if (provider === 'gmail-api') {
      const from = process.env.EMAIL_FROM;
      const clientId = process.env.GMAIL_API_CLIENT_ID;
      const clientSecret = process.env.GMAIL_API_CLIENT_SECRET;
      const refreshToken = process.env.GMAIL_API_REFRESH_TOKEN;
      if (!from || !clientId || !clientSecret || !refreshToken) {
        throw new ServiceUnavailableException('Gmail API provider is not configured.');
      }

      let tokenResponse: Response;
      try {
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new ServiceUnavailableException('Staff invitation email could not be delivered.');
      }
      if (!tokenResponse.ok) throw new ServiceUnavailableException('Staff invitation email could not be delivered.');
      const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenPayload.access_token) throw new ServiceUnavailableException('Staff invitation email could not be delivered.');

      const rawMessage = await new MailComposer({
        from: `${process.env.EMAIL_FROM_NAME ?? 'RehabMIS'} <${from}>`, to: input.to, subject, text,
      }).compile().build();
      const raw = rawMessage.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      let sendResponse: Response;
      try {
        sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST', headers: { Authorization: `Bearer ${tokenPayload.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw }), signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new ServiceUnavailableException('Staff invitation email could not be delivered.');
      }
      if (!sendResponse.ok) throw new ServiceUnavailableException('Staff invitation email could not be delivered.');
      return;
    }
    if (provider !== 'resend' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      throw new ServiceUnavailableException('Staff invitation email provider is not configured.');
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [input.to], subject, text }),
    });
    if (!response.ok) throw new ServiceUnavailableException('Staff invitation email could not be delivered.');
  }
}
