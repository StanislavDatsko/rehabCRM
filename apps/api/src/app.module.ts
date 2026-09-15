import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { parseApiEnv } from '@repo/config/api-env';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { IdentityModule } from './identity/identity.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { EncountersModule } from './encounters/encounters.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { PatientsModule } from './patients/patients.module';
import { RehabilitationModule } from './rehabilitation/rehabilitation.module';
import { AnatomyModule } from './anatomy/anatomy.module';
import { ProgressModule } from './progress/progress.module';
import { StaffModule } from './staff/staff.module';
import { ObservabilityModule } from './observability/observability.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientMediaModule } from './patient-media/media.module';

const env = parseApiEnv();

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req) => {
          const incoming = String(req.headers['x-request-id'] ?? '');
          return /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : randomUUID();
        },
        serializers: {
          req: (request) => ({
            id: request.id,
            method: request.method,
            path: request.url?.split('?')[0],
            remoteAddress: request.remoteAddress,
          }),
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'req.body.password',
            'req.body.accessToken',
            'req.body.refreshToken',
            'req.body.id_token',
            'req.body.summary',
            'req.body.measurements',
            'req.body.reason',
            'req.body.description',
            'req.body.changeSummary',
            'req.body.goals',
            'req.body.phases',
            'req.body.exercisePrescriptions',
            'req.body.instructionsOverride',
            'req.body.specialistNote',
            'req.body.precautions',
            'req.body.progressionCriteria',
            'req.body.regressionCriteria',
            'req.body.targetValue',
            'req.body.targetValueUpper',
            'req.body.note',
            'req.body.anchor',
            'req.body.professionalSummary',
          ],
          remove: true,
        },
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: env.API_RATE_LIMIT_TTL_MS,
          limit: env.API_RATE_LIMIT_MAX,
        },
      ],
    }),
    PrismaModule,
    ObservabilityModule,
    PatientPortalModule,
    NotificationsModule,
    PatientMediaModule,
    RedisModule,
    IdentityModule,
    StaffModule,
    PatientsModule,
    AppointmentsModule,
    EncountersModule,
    AssessmentsModule,
    RehabilitationModule,
    AnatomyModule,
    ProgressModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
