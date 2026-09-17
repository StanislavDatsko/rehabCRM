import { Injectable, ServiceUnavailableException } from '@nestjs/common';

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
