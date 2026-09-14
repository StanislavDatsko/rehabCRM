import { Controller, Get, Headers, HttpStatus, Res, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { parseApiEnv } from '@repo/config/api-env';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { HealthService } from './health.service';
import { MetricsService } from '../../observability/metrics.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  private readonly env = parseApiEnv();

  constructor(
    private readonly health: HealthService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('live')
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness (process is running)' })
  @ApiOkResponse({ description: 'API process is alive' })
  live() {
    return this.health.live();
  }

  @Get('ready')
  @SkipThrottle()
  @ApiOperation({ summary: 'Readiness (dependencies reachable)' })
  async ready(@Res({ passthrough: true }) response: Response) {
    const result = await this.health.ready();
    if (result.status === 'down') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Get('info')
  @SkipThrottle()
  @ApiOperation({ summary: 'Non-sensitive release metadata' })
  info() {
    return this.health.info();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus-compatible operational metrics' })
  metricsText(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    const configured = this.env.METRICS_TOKEN;
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (
      !configured ||
      configured.length !== supplied.length ||
      !timingSafeEqual(Buffer.from(configured), Buffer.from(supplied))
    ) {
      throw new UnauthorizedException('Metrics authentication is required.');
    }
    response.type('text/plain; version=0.0.4').send(this.metrics.renderPrometheus());
  }
}
