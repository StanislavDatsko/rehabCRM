import {
  MembershipStatus,
  PatientSex,
  PatientStatus,
  PrismaClient,
  StaffRole,
  UserStatus,
} from '@prisma/client';
import { DEV_SEED, IDENTITY_PROVIDER, devSeedPatientId } from '../src/identity/dev-seed-ids';
import { seedAnatomy, seedDemoBodyAnnotations } from './anatomy-seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.DEPLOYMENT_ENV === 'production') {
    throw new Error('Development seed is disabled in production.');
  }
  await prisma.organization.upsert({
    where: { slug: DEV_SEED.organizations.demo.slug },
    update: { name: DEV_SEED.organizations.demo.name },
    create: {
      id: DEV_SEED.organizations.demo.id,
      name: DEV_SEED.organizations.demo.name,
      slug: DEV_SEED.organizations.demo.slug,
      timezone: 'Europe/Kyiv',
    },
  });

  await prisma.organization.upsert({
    where: { slug: DEV_SEED.organizations.other.slug },
    update: { name: DEV_SEED.organizations.other.name },
    create: {
      id: DEV_SEED.organizations.other.id,
      name: DEV_SEED.organizations.other.name,
      slug: DEV_SEED.organizations.other.slug,
      timezone: 'Europe/Kyiv',
    },
  });

  const staff = [
    {
      id: DEV_SEED.users.organizationAdmin,
      subject: DEV_SEED.keycloakSubjects.organizationAdmin,
      email: 'admin@rehabcrm.local',
      displayName: 'Iryna Organization Admin',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.ORGANIZATION_ADMIN,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: false,
    },
    {
      id: DEV_SEED.users.receptionist,
      subject: DEV_SEED.keycloakSubjects.receptionist,
      email: 'receptionist@rehabcrm.local',
      displayName: 'Olena Reception Demo',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.RECEPTIONIST,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: false,
    },
    {
      id: DEV_SEED.users.specialist,
      subject: DEV_SEED.keycloakSubjects.specialist,
      email: 'specialist@rehabcrm.local',
      displayName: 'Andriy Specialist Demo',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.REHABILITATION_SPECIALIST,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: true,
    },
    {
      id: DEV_SEED.users.disabledUser,
      subject: DEV_SEED.keycloakSubjects.disabledUser,
      email: 'disabled-user@rehabcrm.local',
      displayName: 'Disabled User Demo',
      status: UserStatus.DISABLED,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.RECEPTIONIST,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: false,
    },
    {
      id: DEV_SEED.users.disabledMembership,
      subject: DEV_SEED.keycloakSubjects.disabledMembership,
      email: 'disabled-membership@rehabcrm.local',
      displayName: 'Disabled Membership Demo',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.REHABILITATION_SPECIALIST,
      membershipStatus: MembershipStatus.DISABLED,
      practitioner: true,
    },
    {
      id: DEV_SEED.users.otherOrgSpecialist,
      subject: DEV_SEED.keycloakSubjects.otherOrgSpecialist,
      email: 'other-specialist@rehabcrm.local',
      displayName: 'Other Clinic Specialist Demo',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.other.id,
      role: StaffRole.REHABILITATION_SPECIALIST,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: true,
    },
    {
      id: DEV_SEED.users.patient,
      subject: DEV_SEED.keycloakSubjects.patient,
      email: 'patient@rehabcrm.local',
      displayName: 'Demo Patient Portal',
      status: UserStatus.ACTIVE,
      orgId: DEV_SEED.organizations.demo.id,
      role: StaffRole.PATIENT,
      membershipStatus: MembershipStatus.ACTIVE,
      practitioner: false,
    },
  ] as const;

  for (const person of staff) {
    const [firstName = person.displayName, ...lastNameParts] = person.displayName.split(' ');
    const lastName = lastNameParts.join(' ') || null;
    await prisma.user.upsert({
      where: {
        identityProvider_identityProviderSubject: {
          identityProvider: IDENTITY_PROVIDER,
          identityProviderSubject: person.subject,
        },
      },
      update: {
        id: person.id,
        email: person.email,
        firstName,
        lastName,
        displayName: person.displayName,
        status: person.status,
      },
      create: {
        id: person.id,
        identityProvider: IDENTITY_PROVIDER,
        identityProviderSubject: person.subject,
        email: person.email,
        firstName,
        lastName,
        displayName: person.displayName,
        status: person.status,
      },
    });

    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: person.orgId,
          userId: person.id,
        },
      },
      update: {
        role: person.role,
        status: person.membershipStatus,
      },
      create: {
        organizationId: person.orgId,
        userId: person.id,
        role: person.role,
        status: person.membershipStatus,
      },
    });

    if (person.practitioner) {
      await prisma.practitioner.upsert({
        where: {
          organizationId_userId: {
            organizationId: person.orgId,
            userId: person.id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          organizationId: person.orgId,
          userId: person.id,
        },
      });
    }
  }

  const demoPractitioner = await prisma.practitioner.findUniqueOrThrow({
    where: {
      organizationId_userId: {
        organizationId: DEV_SEED.organizations.demo.id,
        userId: DEV_SEED.users.specialist,
      },
    },
  });
  const otherPractitioner = await prisma.practitioner.findUniqueOrThrow({
    where: {
      organizationId_userId: {
        organizationId: DEV_SEED.organizations.other.id,
        userId: DEV_SEED.users.otherOrgSpecialist,
      },
    },
  });

  const firstNames = [
    'Олексій',
    'Марія',
    'Іван',
    'Наталія',
    'Тарас',
    'Софія',
    'Максим',
    'Ганна',
    'Богдан',
    'Катерина',
  ];
  const lastNames = ['Тестенко', 'Демонстраційна', 'Приклад', 'Навчальна', 'Вигаданий'];
  const statuses = [
    PatientStatus.ACTIVE,
    PatientStatus.ACTIVE,
    PatientStatus.INACTIVE,
    PatientStatus.COMPLETED,
    PatientStatus.ARCHIVED,
  ];

  for (let index = 0; index < 24; index += 1) {
    const inOtherOrganization = index >= 20;
    const organizationId = inOtherOrganization
      ? DEV_SEED.organizations.other.id
      : DEV_SEED.organizations.demo.id;
    const actorUserId = inOtherOrganization
      ? DEV_SEED.users.otherOrgSpecialist
      : DEV_SEED.users.receptionist;
    const patientId = devSeedPatientId(index);
    const firstName = firstNames[index % firstNames.length] ?? 'Тест';
    const lastName = lastNames[index % lastNames.length] ?? 'Пацієнт';

    await prisma.patient.upsert({
      where: { id: patientId },
      update: {},
      create: {
        id: patientId,
        organizationId,
        firstName,
        lastName,
        middleName: index % 3 === 0 ? 'Демо' : null,
        dateOfBirth: new Date(Date.UTC(1965 + index, index % 12, (index % 24) + 1)),
        sex: index % 2 === 0 ? PatientSex.MALE : PatientSex.FEMALE,
        phoneDisplay: `+380 67 000 ${String(index).padStart(4, '0')}`,
        phoneNormalized: `+38067000${String(index).padStart(4, '0')}`,
        email: index % 4 === 0 ? `fake.patient${index}@example.invalid` : null,
        city: index % 2 === 0 ? 'Київ' : 'Львів',
        countryCode: 'UA',
        responsiblePractitionerId: inOtherOrganization ? otherPractitioner.id : demoPractitioner.id,
        status: statuses[index % statuses.length] ?? PatientStatus.ACTIVE,
        internalReferenceNumber: `DEV-${String(index + 1).padStart(4, '0')}`,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });

    const hasCreatedEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: 'Patient',
        entityId: patientId,
        action: 'PATIENT_CREATED',
      },
      select: { id: true },
    });
    if (!hasCreatedEvent) {
      await prisma.auditEvent.create({
        data: {
          organizationId,
          actorUserId,
          action: 'PATIENT_CREATED',
          entityType: 'Patient',
          entityId: patientId,
          requestId: 'development-seed',
          metadata: { changedFields: [] },
        },
      });
    }
  }

  await prisma.patientPortalAccount.upsert({
    where: { id: DEV_SEED.portalAccounts.demo },
    update: { organizationId: DEV_SEED.organizations.demo.id, userId: DEV_SEED.users.patient, patientId: DEV_SEED.patients.demo, status: 'ACTIVE', updatedByUserId: DEV_SEED.users.specialist },
    create: { id: DEV_SEED.portalAccounts.demo, organizationId: DEV_SEED.organizations.demo.id, userId: DEV_SEED.users.patient, patientId: DEV_SEED.patients.demo, status: 'ACTIVE', createdByUserId: DEV_SEED.users.specialist, updatedByUserId: DEV_SEED.users.specialist },
  });

  const demoOrgId = DEV_SEED.organizations.demo.id;
  const receptionistId = DEV_SEED.users.receptionist;
  const specialistUserId = DEV_SEED.users.specialist;

  await prisma.location.upsert({
    where: { id: DEV_SEED.locations.demoMain },
    update: { name: 'Головний центр', status: 'ACTIVE', timezone: 'Europe/Kyiv' },
    create: {
      id: DEV_SEED.locations.demoMain,
      organizationId: demoOrgId,
      name: 'Головний центр',
      addressLine1: 'вул. Хрещатик, 1',
      city: 'Київ',
      timezone: 'Europe/Kyiv',
    },
  });

  await prisma.location.upsert({
    where: { id: DEV_SEED.locations.demoBranch },
    update: { name: 'Філія №2', status: 'ACTIVE', timezone: 'Europe/Kyiv' },
    create: {
      id: DEV_SEED.locations.demoBranch,
      organizationId: demoOrgId,
      name: 'Філія №2',
      city: 'Львів',
      timezone: 'Europe/Kyiv',
    },
  });

  const rooms = [
    {
      id: DEV_SEED.rooms.demoCabinet1,
      locationId: DEV_SEED.locations.demoMain,
      name: 'Кабінет 1',
    },
    {
      id: DEV_SEED.rooms.demoGym,
      locationId: DEV_SEED.locations.demoMain,
      name: 'Зал ЛФК',
    },
    {
      id: DEV_SEED.rooms.demoMassage,
      locationId: DEV_SEED.locations.demoMain,
      name: 'Масажний кабінет',
    },
    {
      id: DEV_SEED.rooms.demoBranchCabinet,
      locationId: DEV_SEED.locations.demoBranch,
      name: 'Кабінет філії',
    },
  ] as const;

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: { name: room.name, status: 'ACTIVE' },
      create: {
        id: room.id,
        organizationId: demoOrgId,
        locationId: room.locationId,
        name: room.name,
      },
    });
  }

  const appointmentTypes = [
    {
      id: DEV_SEED.appointmentTypes.primaryConsult,
      name: 'Первинна консультація',
      defaultDurationMinutes: 60,
    },
    {
      id: DEV_SEED.appointmentTypes.followUp,
      name: 'Повторний прийом',
      defaultDurationMinutes: 45,
    },
    {
      id: DEV_SEED.appointmentTypes.rehabSession,
      name: 'Реабілітаційне заняття',
      defaultDurationMinutes: 60,
    },
    {
      id: DEV_SEED.appointmentTypes.assessment,
      name: 'Функціональне оцінювання',
      defaultDurationMinutes: 90,
    },
  ] as const;

  for (const type of appointmentTypes) {
    await prisma.appointmentType.upsert({
      where: { id: type.id },
      update: {
        name: type.name,
        defaultDurationMinutes: type.defaultDurationMinutes,
        status: 'ACTIVE',
      },
      create: {
        id: type.id,
        organizationId: demoOrgId,
        name: type.name,
        defaultDurationMinutes: type.defaultDurationMinutes,
      },
    });
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0),
  );
  const tomorrow = new Date(startOfToday);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const yesterday = new Date(startOfToday);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const lastWeek = new Date(startOfToday);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);

  const demoPatientId = DEV_SEED.patients.demo;

  const seedAppointments = [
    {
      id: DEV_SEED.appointments.scheduledTomorrow,
      startsAt: new Date(tomorrow.getTime()),
      endsAt: new Date(tomorrow.getTime() + 60 * 60_000),
      status: 'SCHEDULED' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.primaryConsult,
      roomId: DEV_SEED.rooms.demoCabinet1,
      reason: 'Первинний огляд після травми',
    },
    {
      id: DEV_SEED.appointments.confirmedToday,
      startsAt: new Date(startOfToday.getTime() + 2 * 60 * 60_000),
      endsAt: new Date(startOfToday.getTime() + 3 * 60 * 60_000),
      status: 'CONFIRMED' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.followUp,
      roomId: DEV_SEED.rooms.demoCabinet1,
      reason: 'Контрольний візит',
    },
    {
      id: DEV_SEED.appointments.checkedInToday,
      startsAt: new Date(startOfToday.getTime() + 4 * 60 * 60_000),
      endsAt: new Date(startOfToday.getTime() + 5 * 60 * 60_000),
      status: 'CHECKED_IN' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.rehabSession,
      roomId: DEV_SEED.rooms.demoGym,
      reason: 'Заняття ЛФК',
    },
    {
      id: DEV_SEED.appointments.completedLastWeek,
      startsAt: new Date(lastWeek.getTime() + 3 * 60 * 60_000),
      endsAt: new Date(lastWeek.getTime() + 4 * 60 * 60_000),
      status: 'COMPLETED' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.assessment,
      roomId: DEV_SEED.rooms.demoMassage,
      reason: 'Оцінювання функції',
    },
    {
      id: DEV_SEED.appointments.cancelledFuture,
      startsAt: new Date(tomorrow.getTime() + 3 * 60 * 60_000),
      endsAt: new Date(tomorrow.getTime() + 4 * 60 * 60_000),
      status: 'CANCELLED' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.followUp,
      roomId: null,
      reason: 'Скасовано за запитом пацієнта',
      cancellationReason: 'Пацієнт переніс візит',
    },
    {
      id: DEV_SEED.appointments.noShowPast,
      startsAt: new Date(yesterday.getTime() + 2 * 60 * 60_000),
      endsAt: new Date(yesterday.getTime() + 3 * 60 * 60_000),
      status: 'NO_SHOW' as const,
      appointmentTypeId: DEV_SEED.appointmentTypes.followUp,
      roomId: DEV_SEED.rooms.demoCabinet1,
      reason: 'Повторний візит',
    },
  ] as const;

  for (const appt of seedAppointments) {
    await prisma.appointment.upsert({
      where: { id: appt.id },
      update: {
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        status: appt.status,
      },
      create: {
        id: appt.id,
        organizationId: demoOrgId,
        patientId: demoPatientId,
        practitionerId: demoPractitioner.id,
        locationId: DEV_SEED.locations.demoMain,
        roomId: appt.roomId,
        appointmentTypeId: appt.appointmentTypeId,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        status: appt.status,
        reason: appt.reason,
        cancellationReason: 'cancellationReason' in appt ? (appt.cancellationReason ?? null) : null,
        createdByUserId: receptionistId,
        updatedByUserId: receptionistId,
      },
    });
  }

  await prisma.encounter.upsert({
    where: { id: DEV_SEED.encounters.completedLastWeek },
    update: { status: 'COMPLETED' },
    create: {
      id: DEV_SEED.encounters.completedLastWeek,
      organizationId: demoOrgId,
      patientId: demoPatientId,
      practitionerId: demoPractitioner.id,
      appointmentId: DEV_SEED.appointments.completedLastWeek,
      startedAt: new Date(lastWeek.getTime() + 3 * 60 * 60_000),
      endedAt: new Date(lastWeek.getTime() + 4 * 60 * 60_000),
      status: 'COMPLETED',
      createdByUserId: specialistUserId,
      updatedByUserId: specialistUserId,
    },
  });

  const definitionSeeds = [
    {
      id: 'a5000000-0000-4000-8000-000000000001',
      code: 'pain.nrs',
      name: 'Інтенсивність болю',
      description: 'Числова шкала 0–10; значення вводить фахівець без автоматичної інтерпретації.',
      valueType: 'INTEGER' as const,
      unitCode: null,
      minimumValue: 0,
      maximumValue: 10,
      category: 'PAIN' as const,
      anatomicalApplicability: 'OPTIONAL' as const,
    },
    {
      id: 'a5000000-0000-4000-8000-000000000002',
      code: 'rom.flexion',
      name: 'Згинання',
      description: 'Активний або пасивний обсяг руху відповідно до контексту фахівця.',
      valueType: 'NUMBER' as const,
      unitCode: 'deg',
      minimumValue: -30,
      maximumValue: 220,
      category: 'RANGE_OF_MOTION' as const,
      anatomicalApplicability: 'REQUIRED' as const,
    },
    {
      id: 'a5000000-0000-4000-8000-000000000003',
      code: 'rom.extension',
      name: 'Розгинання',
      description: 'Обсяг розгинання; межі налаштовані у визначенні.',
      valueType: 'NUMBER' as const,
      unitCode: 'deg',
      minimumValue: -90,
      maximumValue: 90,
      category: 'RANGE_OF_MOTION' as const,
      anatomicalApplicability: 'REQUIRED' as const,
    },
    {
      id: 'a5000000-0000-4000-8000-000000000004',
      code: 'strength.mrc',
      name: 'Мʼязова сила (шкала 0–5)',
      description: 'Структурована шкала сили; не є автоматичним діагнозом.',
      valueType: 'SCALE' as const,
      unitCode: null,
      minimumValue: 0,
      maximumValue: 5,
      category: 'STRENGTH' as const,
      anatomicalApplicability: 'REQUIRED' as const,
    },
    {
      id: 'a5000000-0000-4000-8000-000000000005',
      code: 'mobility.timed_up_and_go',
      name: 'Timed Up and Go',
      description: 'Час виконання функціонального тесту.',
      valueType: 'NUMBER' as const,
      unitCode: 's',
      minimumValue: 0,
      maximumValue: 600,
      category: 'FUNCTIONAL_TEST' as const,
      anatomicalApplicability: 'NOT_APPLICABLE' as const,
    },
    {
      id: 'a5000000-0000-4000-8000-000000000006',
      code: 'mobility.walk_distance',
      name: 'Дистанція ходьби',
      description: 'Виміряна дистанція ходьби у визначеному фахівцем тесті.',
      valueType: 'NUMBER' as const,
      unitCode: 'm',
      minimumValue: 0,
      maximumValue: 10000,
      category: 'MOBILITY' as const,
      anatomicalApplicability: 'NOT_APPLICABLE' as const,
    },
  ];

  for (const definition of definitionSeeds) {
    await prisma.measurementDefinition.upsert({
      where: { id: definition.id },
      update: { ...definition, organizationId: null, active: true },
      create: { ...definition, organizationId: null, active: true },
    });
  }

  const templateSeeds = [
    {
      id: 'a5100000-0000-4000-8000-000000000001',
      code: 'lower_limb.initial',
      name: 'Первинна оцінка нижньої кінцівки',
      description:
        'Конфігурований демонстраційний шаблон; не заявлений як валідований клінічний протокол.',
      items: [
        ['a5000000-0000-4000-8000-000000000001', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000002', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000003', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000004', false, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000006', false, null, 'NOT_APPLICABLE'],
      ] as const,
    },
    {
      id: 'a5100000-0000-4000-8000-000000000002',
      code: 'knee.assessment',
      name: 'Оцінка колінного суглоба',
      description:
        'Конфігурований демонстраційний шаблон; потребує локального професійного затвердження.',
      items: [
        ['a5000000-0000-4000-8000-000000000001', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000002', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000003', true, 'knee', 'LEFT'],
        ['a5000000-0000-4000-8000-000000000004', false, 'knee', 'LEFT'],
      ] as const,
    },
    {
      id: 'a5100000-0000-4000-8000-000000000003',
      code: 'shoulder.assessment',
      name: 'Оцінка плечового суглоба',
      description:
        'Конфігурований демонстраційний шаблон; потребує локального професійного затвердження.',
      items: [
        ['a5000000-0000-4000-8000-000000000001', true, 'shoulder', 'RIGHT'],
        ['a5000000-0000-4000-8000-000000000002', true, 'shoulder', 'RIGHT'],
        ['a5000000-0000-4000-8000-000000000003', false, 'shoulder', 'RIGHT'],
        ['a5000000-0000-4000-8000-000000000004', false, 'shoulder', 'RIGHT'],
      ] as const,
    },
    {
      id: 'a5100000-0000-4000-8000-000000000004',
      code: 'functional.general',
      name: 'Загальна функціональна оцінка',
      description: 'Конфігурований демонстраційний шаблон, а не валідований протокол.',
      items: [
        ['a5000000-0000-4000-8000-000000000001', true, null, null],
        ['a5000000-0000-4000-8000-000000000005', false, null, 'NOT_APPLICABLE'],
        ['a5000000-0000-4000-8000-000000000006', false, null, 'NOT_APPLICABLE'],
      ] as const,
    },
  ];

  for (const template of templateSeeds) {
    await prisma.assessmentTemplate.upsert({
      where: { id: template.id },
      update: { name: template.name, description: template.description, active: true },
      create: {
        id: template.id,
        organizationId: null,
        code: template.code,
        revision: 1,
        name: template.name,
        description: template.description,
        active: true,
        configurableSample: true,
      },
    });
    for (const [index, item] of template.items.entries()) {
      await prisma.assessmentTemplateItem.upsert({
        where: {
          id: `a52${String(templateSeeds.indexOf(template) + 1).padStart(1, '0')}0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        },
        update: {
          measurementDefinitionId: item[0],
          displayOrder: index + 1,
          required: item[1],
          defaultRegionCode: item[2],
          defaultLaterality: item[3],
        },
        create: {
          id: `a52${String(templateSeeds.indexOf(template) + 1).padStart(1, '0')}0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          templateId: template.id,
          measurementDefinitionId: item[0],
          displayOrder: index + 1,
          required: item[1],
          defaultRegionCode: item[2],
          defaultLaterality: item[3],
        },
      });
    }
  }

  const historyAssessments = [
    {
      id: 'a5300000-0000-4000-8000-000000000001',
      batch: '1',
      daysAgo: 14,
      encounterId: null,
      pain: 6,
      flexion: 95,
      extension: -5,
    },
    {
      id: 'a5300000-0000-4000-8000-000000000002',
      batch: '2',
      daysAgo: 7,
      encounterId: DEV_SEED.encounters.completedLastWeek,
      pain: 3,
      flexion: 110,
      extension: -2,
    },
    {
      id: 'a5300000-0000-4000-8000-000000000003',
      batch: '3',
      daysAgo: 1,
      encounterId: null,
      pain: 2,
      flexion: 120,
      extension: 0,
    },
  ];
  for (const history of historyAssessments) {
    const performedAt = new Date(startOfToday);
    performedAt.setUTCDate(performedAt.getUTCDate() - history.daysAgo);
    await prisma.assessment.upsert({
      where: { id: history.id },
      update: {},
      create: {
        id: history.id,
        organizationId: demoOrgId,
        patientId: demoPatientId,
        encounterId: history.encounterId,
        practitionerId: demoPractitioner.id,
        templateId: templateSeeds[1].id,
        title: 'Оцінка колінного суглоба',
        status: 'COMPLETED',
        performedAt,
        completedAt: performedAt,
        summary: 'Вигаданий демонстраційний запис.',
        createdByUserId: specialistUserId,
        updatedByUserId: specialistUserId,
      },
    });
    const values = [history.pain, history.flexion, history.extension];
    for (let index = 0; index < values.length; index += 1) {
      const definition = definitionSeeds[index];
      if (!definition) continue;
      await prisma.measurement.upsert({
        where: {
          id: `a54${history.batch}0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        },
        update: {},
        create: {
          id: `a54${history.batch}0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          organizationId: demoOrgId,
          assessmentId: history.id,
          patientId: demoPatientId,
          encounterId: history.encounterId,
          definitionId: definition.id,
          templateItemId: `a5220000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          definitionCode: definition.code,
          definitionName: definition.name,
          categorySnapshot: definition.category,
          valueTypeSnapshot: definition.valueType,
          unitCodeSnapshot: definition.unitCode,
          minimumValueSnapshot: definition.minimumValue,
          maximumValueSnapshot: definition.maximumValue,
          anatomicalRegionCode: 'knee',
          laterality: 'LEFT',
          numericValue: values[index],
          performedAt,
          createdByUserId: specialistUserId,
        },
      });
    }
  }

  const exerciseSeeds = [
    {
      code: 'knee.quad-set',
      name: 'Ізометричне напруження квадрицепса',
      description: 'Активація передньої групи мʼязів стегна без руху в коліні.',
      instructions:
        'Ляжте або сядьте з випрямленою ногою. Притисніть коліно до опори, напружуючи передню поверхню стегна, утримайте та розслабтеся.',
      category: 'STRENGTH' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['knee', 'hip'],
      laterality: ['LEFT', 'RIGHT', 'BILATERAL'] as const,
      muscles: ['quadriceps'],
      equipment: [] as string[],
      dosage: ['SETS_REPETITIONS', 'HOLD'] as const,
    },
    {
      code: 'knee.heel-slide',
      name: 'Ковзання пʼятою',
      description: 'Активно-асистований рух для згинання та розгинання коліна.',
      instructions:
        'Лежачи на спині, повільно підтягніть пʼяту до сідниці в комфортному діапазоні, потім випряміть ногу.',
      category: 'MOBILITY' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['knee'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['hamstrings', 'quadriceps'],
      equipment: ['килимок'],
      dosage: ['SETS_REPETITIONS'] as const,
    },
    {
      code: 'knee.straight-leg-raise',
      name: 'Підйом прямої ноги',
      description: 'Вправа для контролю розігнутого коліна та сили квадрицепса.',
      instructions:
        'Одну ногу зігніть, іншу тримайте прямою. Напружте квадрицепс і підніміть пряму ногу до рівня протилежного стегна.',
      category: 'STRENGTH' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['knee', 'hip'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['quadriceps', 'hip_flexors'],
      equipment: ['килимок'],
      dosage: ['SETS_REPETITIONS'] as const,
    },
    {
      code: 'knee.terminal-extension-band',
      name: 'Кінцеве розгинання коліна з еластичною стрічкою',
      description: 'Контрольоване розгинання коліна в замкненому кінематичному ланцюзі.',
      instructions:
        'Закріпіть стрічку позаду коліна. Із трохи зігнутого положення повністю випряміть коліно, не відриваючи стопу від підлоги.',
      category: 'STRENGTH' as const,
      difficulty: 'INTERMEDIATE' as const,
      regions: ['knee'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['quadriceps'],
      equipment: ['еластична стрічка'],
      dosage: ['SETS_REPETITIONS', 'LOAD'] as const,
    },
    {
      code: 'hip.bridge',
      name: 'Сідничний місток',
      description: 'Зміцнення розгиначів кульшового суглоба та контроль таза.',
      instructions:
        'Лежачи на спині зі зігнутими колінами, підніміть таз до нейтральної лінії тулуба, не прогинаючи поперек.',
      category: 'STRENGTH' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['hip', 'lumbar_spine'],
      laterality: ['BILATERAL'] as const,
      muscles: ['gluteus_maximus', 'hamstrings'],
      equipment: ['килимок'],
      dosage: ['SETS_REPETITIONS', 'HOLD'] as const,
    },
    {
      code: 'hip.clamshell',
      name: '«Мушля» лежачи на боці',
      description: 'Контроль відведення та зовнішньої ротації кульшового суглоба.',
      instructions:
        'Лежачи на боці із зігнутими колінами, тримайте стопи разом і підніміть верхнє коліно без обертання таза.',
      category: 'STRENGTH' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['hip'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['gluteus_medius'],
      equipment: ['килимок'],
      dosage: ['SETS_REPETITIONS', 'LOAD'] as const,
    },
    {
      code: 'ankle.pump',
      name: 'Тильне та підошовне згинання стопи',
      description: 'Активні рухи гомілковостопного суглоба в комфортному діапазоні.',
      instructions:
        'Повільно тягніть носок на себе, потім від себе. Не рухайте коліном і не форсуйте біль.',
      category: 'MOBILITY' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['ankle'],
      laterality: ['LEFT', 'RIGHT', 'BILATERAL'] as const,
      muscles: ['calf', 'tibialis_anterior'],
      equipment: [] as string[],
      dosage: ['SETS_REPETITIONS'] as const,
    },
    {
      code: 'ankle.calf-raise',
      name: 'Підйом на носки стоячи',
      description: 'Зміцнення литкових мʼязів у положенні стоячи.',
      instructions:
        'Тримаючись за стабільну опору, повільно підніміться на носки та контрольовано опустіться.',
      category: 'STRENGTH' as const,
      difficulty: 'INTERMEDIATE' as const,
      regions: ['ankle'],
      laterality: ['LEFT', 'RIGHT', 'BILATERAL'] as const,
      muscles: ['gastrocnemius', 'soleus'],
      equipment: ['стабільна опора'],
      dosage: ['SETS_REPETITIONS', 'LOAD'] as const,
    },
    {
      code: 'balance.single-leg-stance',
      name: 'Стійка на одній нозі',
      description: 'Тренування статичного балансу з доступною опорою.',
      instructions:
        'Станьте біля стабільної опори. Перенесіть вагу на одну ногу та утримуйте положення лише настільки, наскільки це безпечно.',
      category: 'BALANCE' as const,
      difficulty: 'INTERMEDIATE' as const,
      regions: ['ankle', 'knee', 'hip'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['hip_abductors', 'calf'],
      equipment: ['стабільна опора'],
      dosage: ['TRIALS', 'DURATION'] as const,
    },
    {
      code: 'functional.sit-to-stand',
      name: 'Вставання зі стільця',
      description: 'Функціональна практика переходу з сидіння у стояння.',
      instructions:
        'Сядьте ближче до краю стільця, поставте стопи під коліна, нахиліть тулуб уперед і встаньте контрольовано.',
      category: 'FUNCTIONAL' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['knee', 'hip'],
      laterality: ['BILATERAL'] as const,
      muscles: ['quadriceps', 'gluteus_maximus'],
      equipment: ['стілець'],
      dosage: ['SETS_REPETITIONS'] as const,
    },
    {
      code: 'shoulder.pendulum',
      name: 'Маятникові рухи плечем',
      description: 'Мʼякі рухи плечового суглоба з підтримкою ваги тулубом.',
      instructions:
        'Спираючись здоровою рукою, нахиліться вперед і розслабте робочу руку. Виконуйте невеликі контрольовані кола рухом тулуба.',
      category: 'MOBILITY' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['shoulder'],
      laterality: ['LEFT', 'RIGHT'] as const,
      muscles: ['shoulder_complex'],
      equipment: ['стабільна опора'],
      dosage: ['DURATION'] as const,
    },
    {
      code: 'shoulder.wall-slide',
      name: 'Ковзання руками по стіні',
      description: 'Контрольоване піднімання рук із підтримкою стіни.',
      instructions:
        'Поставте передпліччя або долоні на стіну та повільно ковзайте вгору до комфортної висоти, зберігаючи контроль лопаток.',
      category: 'MOBILITY' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['shoulder', 'thoracic_spine'],
      laterality: ['LEFT', 'RIGHT', 'BILATERAL'] as const,
      muscles: ['serratus_anterior', 'rotator_cuff'],
      equipment: ['стіна'],
      dosage: ['SETS_REPETITIONS'] as const,
    },
    {
      code: 'breathing.diaphragmatic',
      name: 'Діафрагмальне дихання',
      description: 'Спокійна практика керованого дихання у зручному положенні.',
      instructions:
        'Покладіть руку на живіт. Вдихайте носом без напруження, відчуваючи мʼякий рух живота, і повільно видихайте.',
      category: 'BREATHING' as const,
      difficulty: 'FOUNDATIONAL' as const,
      regions: ['thoracic_spine'],
      laterality: ['NOT_APPLICABLE'] as const,
      muscles: ['diaphragm'],
      equipment: [] as string[],
      dosage: ['TRIALS', 'DURATION'] as const,
    },
  ];

  const exerciseIds = new Map<string, string>();
  for (const [index, exercise] of exerciseSeeds.entries()) {
    const id = `b6000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    exerciseIds.set(exercise.code, id);
    await prisma.exerciseDefinition.upsert({
      where: { id },
      update: {
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        category: exercise.category,
        difficulty: exercise.difficulty,
        anatomicalRegionCodes: exercise.regions,
        lateralityApplicability: [...exercise.laterality],
        targetMuscleGroupCodes: exercise.muscles,
        equipment: exercise.equipment,
        supportedDosageKinds: [...exercise.dosage],
        active: true,
      },
      create: {
        id,
        organizationId: null,
        code: exercise.code,
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        category: exercise.category,
        difficulty: exercise.difficulty,
        anatomicalRegionCodes: exercise.regions,
        lateralityApplicability: [...exercise.laterality],
        targetMuscleGroupCodes: exercise.muscles,
        equipment: exercise.equipment,
        supportedDosageKinds: [...exercise.dosage],
        contraindicationNotes:
          'Перевірте індивідуальні протипоказання та обмеження пацієнта перед призначенням.',
        safetyNotes:
          'Припиніть вправу при новому або різко посиленому болю, запамороченні чи втраті контролю руху.',
        active: true,
      },
    });
  }

  const demoPlanId = 'b6100000-0000-4000-8000-000000000001';
  const demoRevisionId = 'b6110000-0000-4000-8000-000000000001';
  const demoPhaseId = 'b6120000-0000-4000-8000-000000000001';
  const planStart = new Date(startOfToday);
  planStart.setUTCDate(planStart.getUTCDate() - 14);
  const planEnd = new Date(planStart);
  planEnd.setUTCDate(planEnd.getUTCDate() + 56);

  await prisma.rehabilitationPlan.upsert({
    where: { id: demoPlanId },
    update: {},
    create: {
      id: demoPlanId,
      organizationId: demoOrgId,
      patientId: demoPatientId,
      responsiblePractitionerId: demoPractitioner.id,
      status: 'DRAFT',
      createdByUserId: specialistUserId,
      updatedByUserId: specialistUserId,
    },
  });
  await prisma.rehabilitationPlanRevision.upsert({
    where: { id: demoRevisionId },
    update: {
      title: 'Відновлення функції лівого коліна',
      description: 'Вигаданий демонстраційний план для перевірки наскрізного робочого процесу.',
      startDate: planStart,
      expectedEndDate: planEnd,
    },
    create: {
      id: demoRevisionId,
      organizationId: demoOrgId,
      planId: demoPlanId,
      revisionNumber: 1,
      status: 'PUBLISHED',
      title: 'Відновлення функції лівого коліна',
      description: 'Вигаданий демонстраційний план для перевірки наскрізного робочого процесу.',
      startDate: planStart,
      expectedEndDate: planEnd,
      effectiveFrom: planStart,
      changeSummary: 'Початкова версія демонстраційного плану.',
      createdByUserId: specialistUserId,
    },
  });
  await prisma.rehabilitationPlanPhase.upsert({
    where: { id: demoPhaseId },
    update: { name: 'Контроль болю та відновлення руху', displayOrder: 0 },
    create: {
      id: demoPhaseId,
      organizationId: demoOrgId,
      planRevisionId: demoRevisionId,
      name: 'Контроль болю та відновлення руху',
      description: 'Початкова фаза з поступовим збільшенням контрольованого навантаження.',
      displayOrder: 0,
      expectedStart: planStart,
      criteria: 'Переносимість призначеного навантаження оцінює фахівець.',
    },
  });

  const seededGoals = [
    {
      id: 'b6130000-0000-4000-8000-000000000001',
      title: 'Зменшити інтенсивність болю',
      definitionId: definitionSeeds[0]!.id,
      operator: 'LESS_THAN_OR_EQUAL' as const,
      target: 2,
      unit: null,
      baselineId: 'a5410000-0000-4000-8000-000000000001',
      baseline: 6,
      code: 'pain.nrs',
      name: 'Інтенсивність болю',
    },
    {
      id: 'b6130000-0000-4000-8000-000000000002',
      title: 'Збільшити згинання лівого коліна',
      definitionId: definitionSeeds[1]!.id,
      operator: 'GREATER_THAN_OR_EQUAL' as const,
      target: 120,
      unit: 'deg',
      baselineId: 'a5410000-0000-4000-8000-000000000002',
      baseline: 95,
      code: 'rom.flexion',
      name: 'Згинання',
    },
  ];
  for (const [index, goal] of seededGoals.entries()) {
    await prisma.rehabilitationGoal.upsert({
      where: { id: goal.id },
      update: { status: 'IN_PROGRESS', targetValue: goal.target },
      create: {
        id: goal.id,
        organizationId: demoOrgId,
        planRevisionId: demoRevisionId,
        title: goal.title,
        category: index === 0 ? 'Біль' : 'Обсяг руху',
        anatomicalRegionCode: 'knee',
        laterality: 'LEFT',
        status: 'IN_PROGRESS',
        measurementDefinitionId: goal.definitionId,
        targetOperator: goal.operator,
        targetValue: goal.target,
        targetUnitCode: goal.unit,
        baselineMeasurementId: goal.baselineId,
        baselineNumericValueSnapshot: goal.baseline,
        baselineUnitCodeSnapshot: goal.unit,
        baselineDefinitionCode: goal.code,
        baselineDefinitionName: goal.name,
        baselinePerformedAt: planStart,
        displayOrder: index,
      },
    });
  }

  const seededPrescriptions = [
    {
      id: 'b6140000-0000-4000-8000-000000000001',
      code: 'knee.quad-set',
      sets: 3,
      repetitions: 10,
      holdSeconds: 5,
    },
    {
      id: 'b6140000-0000-4000-8000-000000000002',
      code: 'knee.heel-slide',
      sets: 3,
      repetitions: 10,
      holdSeconds: null,
    },
    {
      id: 'b6140000-0000-4000-8000-000000000003',
      code: 'functional.sit-to-stand',
      sets: 2,
      repetitions: 8,
      holdSeconds: null,
    },
  ];
  for (const [index, prescription] of seededPrescriptions.entries()) {
    const definition = exerciseSeeds.find((exercise) => exercise.code === prescription.code)!;
    await prisma.exercisePrescription.upsert({
      where: { id: prescription.id },
      update: {
        sets: prescription.sets,
        repetitions: prescription.repetitions,
        holdSeconds: prescription.holdSeconds,
      },
      create: {
        id: prescription.id,
        organizationId: demoOrgId,
        planRevisionId: demoRevisionId,
        phaseId: demoPhaseId,
        exerciseDefinitionId: exerciseIds.get(prescription.code)!,
        exerciseCodeSnapshot: prescription.code,
        exerciseNameSnapshot: definition.name,
        laterality: 'LEFT',
        anatomicalRegionCode: 'knee',
        sets: prescription.sets,
        repetitions: prescription.repetitions,
        holdSeconds: prescription.holdSeconds,
        frequencyType: 'DAILY',
        sessionsPerDay: 1,
        daysPerWeek: 5,
        specialistNote:
          'Демонстраційне призначення; дозування має підтвердити відповідальний фахівець.',
        displayOrder: index,
      },
    });
  }

  const revisedAt = new Date(startOfToday);
  revisedAt.setUTCDate(revisedAt.getUTCDate() - 2);
  const secondRevisionId = 'b6110000-0000-4000-8000-000000000002';
  const secondPhaseId = 'b6120000-0000-4000-8000-000000000002';
  await prisma.rehabilitationPlanRevision.upsert({
    where: { id: secondRevisionId },
    update: {},
    create: {
      id: secondRevisionId,
      organizationId: demoOrgId,
      planId: demoPlanId,
      basedOnRevisionId: demoRevisionId,
      revisionNumber: 2,
      status: 'PUBLISHED',
      title: 'Відновлення функції лівого коліна',
      description: 'Друга демонстраційна редакція після повторного оцінювання.',
      startDate: planStart,
      expectedEndDate: planEnd,
      effectiveFrom: revisedAt,
      changeSummary: 'Оновлено ціль згинання та дозування після фактичних вимірювань.',
      createdByUserId: specialistUserId,
    },
  });
  await prisma.rehabilitationPlanPhase.upsert({
    where: { id: secondPhaseId },
    update: {},
    create: {
      id: secondPhaseId,
      organizationId: demoOrgId,
      planRevisionId: secondRevisionId,
      name: 'Рух і контрольоване зміцнення',
      description: 'Демонстраційна прогресія навантаження.',
      displayOrder: 0,
      expectedStart: revisedAt,
      criteria: 'Навантаження коригує фахівець за переносимістю.',
    },
  });
  for (const [index, goal] of seededGoals.entries()) {
    await prisma.rehabilitationGoal.upsert({
      where: { id: `b6130000-0000-4000-8000-00000000001${index + 1}` },
      update: {},
      create: {
        id: `b6130000-0000-4000-8000-00000000001${index + 1}`,
        organizationId: demoOrgId,
        planRevisionId: secondRevisionId,
        title: goal.title,
        category: index === 0 ? 'Біль' : 'Обсяг руху',
        anatomicalRegionCode: 'knee',
        laterality: 'LEFT',
        status: 'IN_PROGRESS',
        measurementDefinitionId: goal.definitionId,
        targetOperator: goal.operator,
        targetValue: index === 0 ? 2 : 125,
        targetUnitCode: goal.unit,
        baselineMeasurementId: goal.baselineId,
        baselineNumericValueSnapshot: goal.baseline,
        baselineUnitCodeSnapshot: goal.unit,
        baselineDefinitionCode: goal.code,
        baselineDefinitionName: goal.name,
        baselinePerformedAt: planStart,
        displayOrder: index,
      },
    });
  }
  for (const [index, prescription] of seededPrescriptions.slice(0, 2).entries()) {
    const definition = exerciseSeeds.find((exercise) => exercise.code === prescription.code)!;
    await prisma.exercisePrescription.upsert({
      where: { id: `b6140000-0000-4000-8000-00000000001${index + 1}` },
      update: {},
      create: {
        id: `b6140000-0000-4000-8000-00000000001${index + 1}`,
        organizationId: demoOrgId,
        planRevisionId: secondRevisionId,
        phaseId: secondPhaseId,
        exerciseDefinitionId: exerciseIds.get(prescription.code)!,
        exerciseCodeSnapshot: prescription.code,
        exerciseNameSnapshot: definition.name,
        laterality: 'LEFT',
        anatomicalRegionCode: 'knee',
        sets: index === 0 ? 4 : prescription.sets,
        repetitions: prescription.repetitions,
        holdSeconds: prescription.holdSeconds,
        frequencyType: 'DAILY',
        sessionsPerDay: 1,
        daysPerWeek: 5,
        specialistNote: 'Демонстраційне призначення другої редакції.',
        displayOrder: index,
      },
    });
  }
  await prisma.rehabilitationPlan.update({
    where: { id: demoPlanId },
    data: {
      status: 'ACTIVE',
      currentRevisionId: secondRevisionId,
      cancellationReason: null,
      cancelledAt: null,
      cancelledByUserId: null,
      updatedByUserId: specialistUserId,
    },
  });
  await seedAnatomy(prisma);
  await seedDemoBodyAnnotations(prisma, {
    organizationId: demoOrgId,
    patientId: DEV_SEED.patients.demo,
    practitionerId: demoPractitioner.id,
    userId: specialistUserId,
  });

  const monitoringDates = [new Date(Date.UTC(2026, 8, 13)), new Date(Date.UTC(2026, 8, 14))];
  for (const [index, reportDate] of monitoringDates.entries()) {
    await prisma.dailyReport.upsert({
      where: { organizationId_patientId_reportDate: { organizationId: demoOrgId, patientId: DEV_SEED.patients.demo, reportDate } },
      update: { overallWellbeing: index === 0 ? 7 : 8, fatigueLevel: index === 0 ? 5 : 3, painScore: index === 0 ? 4 : 2, comment: index === 0 ? 'Демонстраційний звіт за попередній день.' : 'Демонстраційний звіт за сьогодні.', source: 'PATIENT_REPORTED' },
      create: { id: index === 0 ? DEV_SEED.monitoring.dailyReportOne : DEV_SEED.monitoring.dailyReportTwo, organizationId: demoOrgId, patientId: DEV_SEED.patients.demo, reportDate, overallWellbeing: index === 0 ? 7 : 8, fatigueLevel: index === 0 ? 5 : 3, painScore: index === 0 ? 4 : 2, comment: index === 0 ? 'Демонстраційний звіт за попередній день.' : 'Демонстраційний звіт за сьогодні.' },
    });
  }
  for (const [index, executionDate] of monitoringDates.entries()) {
    await prisma.exerciseCompletion.upsert({
      where: { organizationId_patientId_exercisePrescriptionId_executionDate: { organizationId: demoOrgId, patientId: DEV_SEED.patients.demo, exercisePrescriptionId: `b6140000-0000-4000-8000-00000000001${index + 1}`, executionDate } },
      update: { status: index === 0 ? 'PARTIAL' : 'COMPLETED', completedSets: index === 0 ? 2 : 4, completedRepetitions: 10, source: 'PATIENT_REPORTED' },
      create: { id: index === 0 ? DEV_SEED.monitoring.completionOne : DEV_SEED.monitoring.completionTwo, organizationId: demoOrgId, patientId: DEV_SEED.patients.demo, rehabilitationPlanId: demoPlanId, planRevisionId: secondRevisionId, exercisePrescriptionId: `b6140000-0000-4000-8000-00000000001${index + 1}`, executionDate, status: index === 0 ? 'PARTIAL' : 'COMPLETED', completedSets: index === 0 ? 2 : 4, completedRepetitions: 10 },
    });
  }
  await prisma.notification.upsert({ where: { id: DEV_SEED.notifications.patientPlanUpdate }, update: { status: 'UNREAD', title: 'Ваш план оновлено', message: 'Ваш план реабілітації оновлено клініцистом.', type: 'PLAN_UPDATED', category: 'PATIENT', recipientUserId: DEV_SEED.users.patient, organizationId: demoOrgId }, create: { id: DEV_SEED.notifications.patientPlanUpdate, organizationId: demoOrgId, recipientUserId: DEV_SEED.users.patient, type: 'PLAN_UPDATED', category: 'PATIENT', title: 'Ваш план оновлено', message: 'Ваш план реабілітації оновлено клініцистом.', relatedPatientId: DEV_SEED.patients.demo } });
  await prisma.notification.upsert({ where: { id: DEV_SEED.notifications.clinicianReport }, update: { status: 'UNREAD', title: 'Новий звіт пацієнта', message: 'Новий звіт пацієнта потребує перегляду.', type: 'NEW_PATIENT_REPORT', category: 'CLINICAL', recipientUserId: specialistUserId, organizationId: demoOrgId, relatedPatientId: DEV_SEED.patients.demo, relatedDailyReportId: DEV_SEED.monitoring.dailyReportTwo }, create: { id: DEV_SEED.notifications.clinicianReport, organizationId: demoOrgId, recipientUserId: specialistUserId, type: 'NEW_PATIENT_REPORT', category: 'CLINICAL', title: 'Новий звіт пацієнта', message: 'Новий звіт пацієнта потребує перегляду.', relatedPatientId: DEV_SEED.patients.demo, relatedDailyReportId: DEV_SEED.monitoring.dailyReportTwo } });
  for (const [id, status] of [[DEV_SEED.notifications.alertOpen, 'OPEN'], [DEV_SEED.notifications.alertAcknowledged, 'ACKNOWLEDGED'], [DEV_SEED.notifications.alertResolved, 'RESOLVED']] as const) {
    await prisma.clinicalAlert.upsert({ where: { id }, update: { status, version: status === 'OPEN' ? 1 : 2 }, create: { id, organizationId: demoOrgId, patientId: DEV_SEED.patients.demo, type: 'SYMPTOM_CHANGE', severity: status === 'RESOLVED' ? 'INFO' : 'ATTENTION', status, title: 'Потребує уваги', summary: 'Показник пацієнта досяг визначеного порогу та потребує перегляду.', sourceDailyReportId: status === 'OPEN' ? DEV_SEED.monitoring.dailyReportTwo : undefined, createdByUserId: specialistUserId, resolvedByUserId: status === 'RESOLVED' ? specialistUserId : undefined, acknowledgedAt: status === 'OPEN' ? undefined : new Date(), resolvedAt: status === 'RESOLVED' ? new Date() : undefined } });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
