import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeycloakIdentityProviderAdminAdapter } from './keycloak-identity-provider-admin.adapter';

describe('KeycloakIdentityProviderAdminAdapter', () => {
  beforeEach(() => {
    process.env.OIDC_ADMIN_BASE_URL = 'http://keycloak.test';
    process.env.OIDC_ADMIN_REALM = 'rehabcrm';
    process.env.OIDC_ADMIN_CLIENT_ID = 'rehabcrm-provisioner';
    process.env.OIDC_ADMIN_CLIENT_SECRET = 'service-secret';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OIDC_ADMIN_BASE_URL;
    delete process.env.OIDC_ADMIN_REALM;
    delete process.env.OIDC_ADMIN_CLIENT_ID;
    delete process.env.OIDC_ADMIN_CLIENT_SECRET;
  });

  it('uses client credentials and creates a passwordless identity with required actions', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'access', expires_in: 60 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { location: 'http://keycloak.test/admin/realms/rehabcrm/users/subject-1' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new KeycloakIdentityProviderAdminAdapter().createStaffIdentity({
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'Member',
    });

    expect(result).toEqual({ subject: 'subject-1' });
    const tokenRequest = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(tokenRequest[1].body)).toContain('grant_type=client_credentials');
    const createRequest = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(createRequest[1].body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('credentials');
    expect(body.requiredActions).toEqual(['VERIFY_EMAIL', 'UPDATE_PASSWORD']);
    expect(createRequest[1].headers).toEqual(
      expect.objectContaining({ authorization: 'Bearer access' }),
    );
  });
});
