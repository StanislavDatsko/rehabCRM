import { describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { ConfiguredStaffMailer } from './staff-mailer';

describe('ConfiguredStaffMailer', () => {
  it('uses the safe console adapter outside production', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'test');
    vi.stubEnv('EMAIL_PROVIDER', 'console');
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await new ConfiguredStaffMailer().sendInvitation({ to: 'a@example.com', organizationName: 'Org', firstName: 'A', role: 'REHABILITATION_SPECIALIST', token: 'raw-token', expiresAt: new Date() });
    expect(log).toHaveBeenCalledWith('Staff invitation email prepared', expect.objectContaining({ to: 'a@example.com' }));
    log.mockRestore();
  });

  it('sends through Resend without logging the raw token', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'production');
    vi.stubEnv('EMAIL_PROVIDER', 'resend');
    vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
    vi.stubEnv('RESEND_API_KEY', 'secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new ConfiguredStaffMailer().sendInvitation({ to: 'a@example.com', organizationName: 'Org', firstName: 'A', role: 'REHABILITATION_SPECIALIST', token: 'raw-token', expiresAt: new Date() });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    fetchMock.mockRestore();
  });

  it('uses an IPv4-only Gmail transport with bounded timeouts', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'production');
    vi.stubEnv('EMAIL_PROVIDER', 'gmail');
    vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
    vi.stubEnv('GMAIL_SMTP_USER', 'invitations@example.com');
    vi.stubEnv('GMAIL_SMTP_APP_PASSWORD', 'app-password');
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'test-message' });
    const createTransport = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);

    await new ConfiguredStaffMailer().sendInvitation({
      to: 'a@example.com',
      organizationName: 'Org',
      firstName: 'A',
      role: 'REHABILITATION_SPECIALIST',
      token: 'raw-token',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user: 'invitations@example.com', pass: 'app-password' },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@example.com',
      to: 'a@example.com',
      subject: 'Вас запрошено до RehabMIS — Org',
      text: expect.stringContaining('raw-token'),
    }));
    createTransport.mockRestore();
  });

  it('fails closed when production email configuration is incomplete', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'production');
    vi.stubEnv('EMAIL_PROVIDER', 'console');
    await expect(new ConfiguredStaffMailer().sendInvitation({ to: 'a@example.com', organizationName: 'Org', firstName: 'A', role: 'REHABILITATION_SPECIALIST', token: 'raw-token', expiresAt: new Date() })).rejects.toThrow('Production email provider is not configured.');
  });
});
