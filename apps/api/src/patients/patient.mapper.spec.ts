import { describe, expect, it } from 'vitest';
import {
  toPatientAdministrativeResponse,
  type PatientWithPractitioner,
} from './patient.mapper';

function basePatient(
  overrides: Partial<PatientWithPractitioner> = {},
): PatientWithPractitioner {
  return {
    id: 'p1',
    organizationId: 'org-a',
    firstName: 'Іван',
    lastName: 'Коваленко',
    middleName: null,
    dateOfBirth: new Date(Date.UTC(1990, 4, 12)),
    sex: 'MALE',
    phoneDisplay: '+380501112233',
    phoneNormalized: '+380501112233',
    email: 'ivan@example.com',
    addressLine1: 'вул. Хрещатик 1',
    addressLine2: null,
    city: 'Київ',
    region: null,
    postalCode: null,
    countryCode: 'UA',
    emergencyContactName: null,
    emergencyContactPhoneDisplay: null,
    emergencyContactPhoneNormalized: null,
    emergencyContactRelationship: null,
    responsiblePractitionerId: null,
    status: 'ACTIVE',
    internalReferenceNumber: null,
    version: 1,
    createdByUserId: 'u1',
    updatedByUserId: 'u1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    responsiblePractitioner: null,
    ...overrides,
  } as PatientWithPractitioner;
}

describe('toPatientAdministrativeResponse', () => {
  it('maps only the administrative contract fields', () => {
    const row = {
      ...basePatient(),
      // Future clinical column must never leak via accidental spread.
      sensitiveClinicalSummary: 'should-not-appear',
    } as PatientWithPractitioner & { sensitiveClinicalSummary: string };

    const dto = toPatientAdministrativeResponse(row);
    expect(dto).toEqual({
      id: 'p1',
      firstName: 'Іван',
      lastName: 'Коваленко',
      middleName: null,
      fullName: 'Коваленко Іван',
      dateOfBirth: '1990-05-12',
      sex: 'MALE',
      phone: '+380501112233',
      email: 'ivan@example.com',
      address: {
        line1: 'вул. Хрещатик 1',
        line2: null,
        city: 'Київ',
        region: null,
        postalCode: null,
        countryCode: 'UA',
      },
      emergencyContact: null,
      responsiblePractitioner: null,
      status: 'ACTIVE',
      internalReferenceNumber: null,
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(dto).not.toHaveProperty('sensitiveClinicalSummary');
    expect(dto).not.toHaveProperty('organizationId');
    expect(dto).not.toHaveProperty('phoneNormalized');
    expect(dto).not.toHaveProperty('createdByUserId');
  });
});
