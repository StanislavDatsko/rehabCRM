import type { AssessmentStatus, Laterality, UnitCode } from '@repo/contracts';

export const assessmentStatusLabel = (status: AssessmentStatus): string =>
  ({ DRAFT: 'Чернетка', COMPLETED: 'Завершено', VOIDED: 'Анульовано' })[status];

export const lateralityLabel = (value: Laterality): string =>
  ({
    LEFT: 'Ліва сторона',
    RIGHT: 'Права сторона',
    BILATERAL: 'Двобічно',
    MIDLINE: 'Серединна структура',
    NOT_APPLICABLE: 'Не застосовується',
  })[value];

export const unitLabel = (unit: UnitCode | null): string => (unit === 'deg' ? '°' : (unit ?? ''));

export function formatClinicalDate(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function assessmentErrorMessage(code?: string): string | null {
  if (!code) return null;
  const messages: Record<string, string> = {
    ASSESSMENT_UPDATE_CONFLICT:
      'Це оцінювання вже було змінено в іншій вкладці або іншим користувачем. Оновіть дані перед повторним збереженням.',
    ASSESSMENT_REQUIRED_MEASUREMENTS_MISSING:
      'Заповніть обов’язкові показники перед завершенням оцінювання.',
    ASSESSMENT_NOT_EDITABLE: 'Завершене або анульоване оцінювання не можна редагувати.',
    MEASUREMENT_INVALID_VALUE: 'Перевірте значення, межі, ділянку тіла та сторону.',
    MEASUREMENT_UNIT_MISMATCH: 'Одиниця вимірювання не відповідає визначенню показника.',
    PRACTITIONER_REQUIRED: 'Для створення оцінювання потрібен активний профіль реабілітолога.',
    FORBIDDEN: 'Недостатньо прав для роботи з клінічними оцінюваннями.',
    VALIDATION_FAILED: 'Перевірте введені дані та дату виконання.',
  };
  return messages[code] ?? 'Не вдалося виконати дію. Спробуйте ще раз.';
}
