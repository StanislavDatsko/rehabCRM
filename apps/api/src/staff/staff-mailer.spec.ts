import { describe, expect, it, vi } from 'vitest';
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

  it('fails closed when production email configuration is incomplete', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'production');
    vi.stubEnv('EMAIL_PROVIDER', 'console');
    await expect(new ConfiguredStaffMailer().sendInvitation({ to: 'a@example.com', organizationName: 'Org', firstName: 'A', role: 'REHABILITATION_SPECIALIST', token: 'raw-token', expiresAt: new Date() })).rejects.toThrow('Production email provider is not configured.');
  });
});
