import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const created = new Counter('appointments_created');
const conflicts = new Counter('appointments_conflicted');

export const options = {
  scenarios: { overlap: { executor: 'shared-iterations', vus: 2, iterations: 2 } },
  thresholds: {
    checks: ['rate==1'],
    appointments_created: ['count==1'],
    appointments_conflicted: ['count==1'],
  },
};

const body = JSON.stringify({
  patientId: __ENV.PATIENT_ID,
  practitionerId: __ENV.PRACTITIONER_ID,
  appointmentTypeId: __ENV.APPOINTMENT_TYPE_ID,
  locationId: __ENV.LOCATION_ID,
  startsAt: __ENV.STARTS_AT,
  endsAt: __ENV.ENDS_AT,
});

export default function () {
  const response = http.post(`${__ENV.API_BASE_URL}/api/v1/appointments`, body, {
    headers: {
      Authorization: `Bearer ${__ENV.RECEPTIONIST_ACCESS_TOKEN}`,
      'content-type': 'application/json',
      'x-request-id': `k6-overlap-${__VU}`,
    },
  });
  check(response, {
    'request succeeds or hits overlap constraint': (result) => [201, 409].includes(result.status),
  });
  if (response.status === 201) created.add(1);
  if (response.status === 409 && response.json('code') === 'APPOINTMENT_TIME_CONFLICT') {
    conflicts.add(1);
  }
}
