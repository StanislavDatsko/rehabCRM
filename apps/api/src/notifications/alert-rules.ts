export const ALERT_POLICY = {
  painThreshold: 7,
  highPainThreshold: 9,
  painIncrease: 3,
  missedReportDays: 3,
  lowExerciseMinimumDays: 3,
} as const;

export function painAttention(pain: number, previousPain?: number | null): { severity: 'ATTENTION' | 'HIGH'; summary: string } | null {
  if (pain >= ALERT_POLICY.painThreshold) return { severity: pain >= ALERT_POLICY.highPainThreshold ? 'HIGH' : 'ATTENTION', summary: 'Біль у новому звіті пацієнта досяг порогового значення та потребує перегляду.' };
  if (previousPain !== null && previousPain !== undefined && pain - previousPain >= ALERT_POLICY.painIncrease) return { severity: 'ATTENTION', summary: 'Біль у новому звіті пацієнта збільшився щонайменше на 3 бали та потребує перегляду.' };
  return null;
}

export function missedReportAttention(consecutiveMissingDays: number) { return consecutiveMissingDays >= ALERT_POLICY.missedReportDays; }
export function lowExerciseAttention(daysWithoutCompletion: number) { return daysWithoutCompletion >= ALERT_POLICY.lowExerciseMinimumDays; }
