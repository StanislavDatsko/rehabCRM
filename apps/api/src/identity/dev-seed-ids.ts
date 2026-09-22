export const IDENTITY_PROVIDER = 'local' as const;

export const DEV_SEED = {
  organizations: {
    demo: {
      id: 'a0e1c000-0000-4000-8000-000000000001',
      name: 'RehabCRM Demo Center',
      slug: 'rehabcrm-demo-center',
    },
    other: {
      id: 'a0e1c000-0000-4000-8000-000000000002',
      name: 'DEV Other Clinic',
      slug: 'dev-other-clinic',
    },
  },
  localSubjects: {
    organizationAdmin: '66666666-6666-4666-8666-666666666666',
    receptionist: '11111111-1111-4111-8111-111111111111',
    specialist: '22222222-2222-4222-8222-222222222222',
    disabledUser: '33333333-3333-4333-8333-333333333333',
    disabledMembership: '44444444-4444-4444-8444-444444444444',
    otherOrgSpecialist: '55555555-5555-4555-8555-555555555555',
    patient: '77777777-7777-4777-8777-777777777778',
  },
  users: {
    organizationAdmin: 'b1000000-0000-4000-8000-000000000006',
    receptionist: 'b1000000-0000-4000-8000-000000000001',
    specialist: 'b1000000-0000-4000-8000-000000000002',
    disabledUser: 'b1000000-0000-4000-8000-000000000003',
    disabledMembership: 'b1000000-0000-4000-8000-000000000004',
    otherOrgSpecialist: 'b1000000-0000-4000-8000-000000000005',
    patient: 'b1000000-0000-4000-8000-000000000007',
  },
  patients: {
    demo: 'd1000000-0000-4000-8000-000000000001',
    other: 'd1000000-0000-4000-8000-000000000002',
  },
  portalAccounts: { demo: 'a1000000-0000-4000-8000-000000000001' },
  monitoring: {
    dailyReportOne: 'a2000000-0000-4000-8000-000000000001',
    dailyReportTwo: 'a2000000-0000-4000-8000-000000000002',
    completionOne: 'a3000000-0000-4000-8000-000000000001',
    completionTwo: 'a3000000-0000-4000-8000-000000000002',
  },
  notifications: {
    patientPlanUpdate: 'a4000000-0000-4000-8000-000000000001',
    clinicianReport: 'a4000000-0000-4000-8000-000000000002',
    alertOpen: 'a5000000-0000-4000-8000-000000000001',
    alertAcknowledged: 'a5000000-0000-4000-8000-000000000002',
    alertResolved: 'a5000000-0000-4000-8000-000000000003',
  },
  locations: {
    demoMain: 'e1000000-0000-4000-8000-000000000001',
    demoBranch: 'e1000000-0000-4000-8000-000000000002',
  },
  rooms: {
    demoCabinet1: 'e2000000-0000-4000-8000-000000000001',
    demoGym: 'e2000000-0000-4000-8000-000000000002',
    demoMassage: 'e2000000-0000-4000-8000-000000000003',
    demoBranchCabinet: 'e2000000-0000-4000-8000-000000000004',
  },
  appointmentTypes: {
    primaryConsult: 'e3000000-0000-4000-8000-000000000001',
    followUp: 'e3000000-0000-4000-8000-000000000002',
    rehabSession: 'e3000000-0000-4000-8000-000000000003',
    assessment: 'e3000000-0000-4000-8000-000000000004',
  },
  appointments: {
    scheduledTomorrow: 'f1000000-0000-4000-8000-000000000001',
    confirmedToday: 'f1000000-0000-4000-8000-000000000002',
    checkedInToday: 'f1000000-0000-4000-8000-000000000003',
    completedLastWeek: 'f1000000-0000-4000-8000-000000000004',
    cancelledFuture: 'f1000000-0000-4000-8000-000000000005',
    noShowPast: 'f1000000-0000-4000-8000-000000000006',
  },
  encounters: {
    completedLastWeek: 'c1000000-0000-4000-8000-000000000001',
  },
} as const;

export function devSeedPatientId(index: number): string {
  if (index === 0) return DEV_SEED.patients.demo;
  if (index === 20) return DEV_SEED.patients.other;
  return `d1000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`;
}
