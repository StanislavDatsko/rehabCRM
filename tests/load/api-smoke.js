import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750'] },
};

export default function () {
  const response = http.get(`${__ENV.API_BASE_URL}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${__ENV.STAFF_ACCESS_TOKEN}`,
      'x-request-id': `k6-${__VU}-${__ITER}`,
    },
  });
  check(response, { authenticated: (result) => result.status === 200 });
  // Two requests/second stays below the default pilot rate limit (120/minute)
  // while still exercising concurrent authenticated traffic for 30 seconds.
  sleep(1);
}
