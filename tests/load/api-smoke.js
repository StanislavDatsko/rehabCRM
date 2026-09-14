import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const authenticationFailures = new Counter('authentication_failures');
const patientId = __ENV.PILOT_PATIENT_ID;

function calendarUrl() {
  const from = new Date();
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  return `${__ENV.API_BASE_URL}/api/v1/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750'] },
};

export default function () {
  const targets = [
    `${__ENV.API_BASE_URL}/api/v1/patients`,
    calendarUrl(),
    `${__ENV.API_BASE_URL}/api/v1/patients/${patientId}/progress/summary`,
  ];
  const response = http.get(targets[(__VU + __ITER) % targets.length], {
    headers: {
      Authorization: `Bearer ${__ENV.STAFF_ACCESS_TOKEN}`,
      'x-request-id': `k6-${__VU}-${__ITER}`,
    },
  });
  if (response.status === 401) {
    authenticationFailures.add(1);
  }
  check(response, { 'authenticated scenario succeeded': (result) => result.status === 200 });
  // Two requests/second stays below the default pilot rate limit (120/minute).
  sleep(1);
}
