import 'reflect-metadata';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestMethod } from '@nestjs/common';
import { json, urlencoded, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { parseApiEnv } from '@repo/config/api-env';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { requestIdMiddleware } from './common/http/request-id.middleware';
import { MetricsService } from './observability/metrics.service';
import { httpObservabilityMiddleware } from './observability/http-observability.middleware';
import { ERROR_TRACKER, type ErrorTrackerPort } from './observability/error-tracker.port';

async function bootstrap(): Promise<void> {
  const env = parseApiEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(requestIdMiddleware);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && origin && origin !== new URL(env.WEB_PUBLIC_URL).origin) {
      response.status(403).json({ message: 'Invalid origin.' });
      return;
    }
    next();
  });
  app.use(httpObservabilityMiddleware(app.get(MetricsService)));
  app.use(json({ limit: '1mb', type: 'application/json' }));
  app.use(urlencoded({ extended: false, limit: '64kb', parameterLimit: 100 }));
  app.enableCors({
    origin: env.WEB_PUBLIC_URL,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'x-request-id'],
    maxAge: 600,
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'health/info', method: RequestMethod.GET },
      { path: 'health/metrics', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new GlobalExceptionFilter(app.get<ErrorTrackerPort>(ERROR_TRACKER)));
  app.enableShutdownHooks();

  if (env.SWAGGER_ENABLED && env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('RehabCRM API')
        .setDescription(
          'Browser clients authenticate using opaque session cookies through the Next.js BFF.',
        )
        .setVersion('0.1.0')
        .addCookieAuth('rehabmis_session')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.API_PORT);
}

void bootstrap();
