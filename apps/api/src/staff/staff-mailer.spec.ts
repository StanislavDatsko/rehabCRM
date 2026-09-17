import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfiguredStaffMailer } from './staff-mailer';

const input = { to: 'a@example.com', organizationName: 'Org', firstName: 'A', role: 'REHABILITATION_SPECIALIST', token: 'raw-token', expiresAt: new Date('2026-01-01T00:00:00.000Z') };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('ConfiguredStaffMailer', () => {
  it('uses console outside production', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'test'); vi.stubEnv('EMAIL_PROVIDER', 'console');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await new ConfiguredStaffMailer().sendInvitation(input);
  });

  it('sends Gmail API MIME over HTTPS with OAuth refresh token', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'gmail-api'); vi.stubEnv('EMAIL_FROM', 'sender@example.com');
    vi.stubEnv('GMAIL_API_CLIENT_ID', 'client-id'); vi.stubEnv('GMAIL_API_CLIENT_SECRET', 'client-secret'); vi.stubEnv('GMAIL_API_REFRESH_TOKEN', 'refresh-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await new ConfiguredStaffMailer().sendInvitation(input);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('client_id=client-id');
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('client_secret=client-secret');
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('refresh_token=refresh-token');
    expect(fetchMock.mock.calls[1][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ Authorization: 'Bearer access-token', 'Content-Type': 'application/json' });
    const raw = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).raw;
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/') + '===', 'base64').toString();
    expect(decoded).toContain('a@example.com'); expect(decoded).toContain('sender@example.com'); expect(decoded).toContain('=?UTF-8?');
    expect(decoded).toContain(Buffer.from('raw-token').toString('base64').slice(0, 8));
  });

  it('converts token and send HTTP failures to safe exceptions', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'gmail-api'); vi.stubEnv('EMAIL_FROM', 'sender@example.com'); vi.stubEnv('GMAIL_API_CLIENT_ID', 'id'); vi.stubEnv('GMAIL_API_CLIENT_SECRET', 'secret'); vi.stubEnv('GMAIL_API_REFRESH_TOKEN', 'refresh');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 400 }));
    await expect(new ConfiguredStaffMailer().sendInvitation(input)).rejects.toThrow('could not be delivered');
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access' }), { status: 200 })).mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await expect(new ConfiguredStaffMailer().sendInvitation(input)).rejects.toThrow('could not be delivered');
  });

  it('fails closed when Gmail API configuration is incomplete', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'gmail-api');
    await expect(new ConfiguredStaffMailer().sendInvitation(input)).rejects.toThrow('not configured');
  });
});
