#!/usr/bin/env node
/**
 * Live check against local Keycloak + API (not a substitute for unit tests).
 * Requires: docker infra, migrated+seeded DB, API on :3001
 */
const issuer = process.env.OIDC_ISSUER ?? 'http://localhost:8080/realms/rehabcrm';
const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
const clientId = process.env.AUTH_KEYCLOAK_ID ?? 'rehabcrm-web';
const clientSecret = process.env.AUTH_KEYCLOAK_SECRET ?? 'rehabcrm-web-dev-secret';

const demoPatient = 'd1000000-0000-4000-8000-000000000001';
const otherPatient = 'd1000000-0000-4000-8000-000000000002';

async function token(username, password) {
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
    }),
  });
  if (!response.ok) {
    throw new Error(`token ${username} ${response.status}`);
  }
  const body = await response.json();
  return body.access_token;
}

async function request(accessToken, path) {
  const response = await fetch(`${api}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function main() {
  const specialist = await token('specialist', 'DevOnly!Specialist1');
  const receptionist = await token('receptionist', 'DevOnly!Receptionist1');
  const disabled = await token('disabled-user', 'DevOnly!DisabledUser1');

  const checks = [];
  const anon = await fetch(`${api}/api/v1/me`);
  checks.push(['anonymous /me', anon.status === 401]);

  const specMe = await request(specialist, '/api/v1/me');
  checks.push(['specialist /me', specMe.status === 200]);

  const specPatient = await request(specialist, `/api/v1/patients/${demoPatient}`);
  checks.push(['specialist patient administration', specPatient.status === 200]);

  const recPatient = await request(receptionist, `/api/v1/patients/${demoPatient}`);
  checks.push(['receptionist patient administration', recPatient.status === 200]);

  const recMe = await request(receptionist, '/api/v1/me');
  checks.push(['receptionist /me', recMe.status === 200]);

  const disabledMe = await request(disabled, '/api/v1/me');
  checks.push(['disabled user /me', disabledMe.status === 403]);

  const cross = await request(specialist, `/api/v1/patients/${otherPatient}`);
  checks.push(['cross-org patient', cross.status === 404]);

  const live = await fetch(`${api}/health/live`);
  checks.push(['public health', live.status === 200]);

  for (const [name, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
