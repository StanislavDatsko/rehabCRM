import { Injectable } from '@nestjs/common';
import type { WorkAnalyticsSummary } from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class WorkAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(principal: AuthenticatedPrincipal): Promise<WorkAnalyticsSummary> {
    const practitioner = await this.prisma.practitioner.findFirst({
      where: { organizationId: principal.organizationId, userId: principal.userId },
      select: { id: true },
    });
    if (!practitioner) return { week: this.empty(), month: this.empty() };
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [week, month] = await Promise.all([this.period(principal.organizationId, practitioner.id, weekStart, now), this.period(principal.organizationId, practitioner.id, monthStart, now)]);
    return { week, month };
  }

  private async period(organizationId: string, practitionerId: string, from: Date, to: Date) {
    const encounters = await this.prisma.encounter.findMany({
      where: { organizationId, practitionerId, status: 'COMPLETED', endedAt: { not: null }, startedAt: { gte: from, lt: to } },
      select: { startedAt: true, endedAt: true, appointment: { select: { priceAmountUah: true } } },
    });
    return { completedVisits: encounters.length, therapyMinutes: encounters.reduce((sum, item) => sum + Math.max(0, Math.round((item.endedAt!.getTime() - item.startedAt.getTime()) / 60000)), 0), revenueMinor: encounters.reduce((sum, item) => sum + (item.appointment?.priceAmountUah ?? 0), 0), currency: 'UAH' as const };
  }

  private empty() { return { completedVisits: 0, therapyMinutes: 0, revenueMinor: 0, currency: 'UAH' as const }; }
}
