import { describe, expect, it } from 'vitest';
import { DEV_SEED, devSeedPatientId } from './dev-seed-ids';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('development seed identifiers', () => {
  it('uses valid UUIDs for every persisted identifier', () => {
    const identifiers = [
      ...Object.values(DEV_SEED.organizations).map(({ id }) => id),
      ...Object.values(DEV_SEED.localSubjects),
      ...Object.values(DEV_SEED.users),
      ...Object.values(DEV_SEED.patients),
      ...Object.values(DEV_SEED.locations),
      ...Object.values(DEV_SEED.rooms),
      ...Object.values(DEV_SEED.appointmentTypes),
      ...Object.values(DEV_SEED.appointments),
      ...Object.values(DEV_SEED.encounters),
    ];

    expect(identifiers).toHaveLength(35);
    expect(identifiers.every((identifier) => UUID_PATTERN.test(identifier))).toBe(true);
  });

  it('keeps deterministic patient fixtures unique and reserves the cross-organization patient', () => {
    const patientIds = Array.from({ length: 24 }, (_, index) => devSeedPatientId(index));

    expect(new Set(patientIds).size).toBe(patientIds.length);
    expect(patientIds[0]).toBe(DEV_SEED.patients.demo);
    expect(patientIds[20]).toBe(DEV_SEED.patients.other);
  });
});
