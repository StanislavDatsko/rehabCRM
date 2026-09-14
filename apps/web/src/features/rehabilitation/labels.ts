import type { RehabilitationPlanStatus } from '@repo/contracts';

export const planStatusLabel = (status: RehabilitationPlanStatus): string =>
  ({
    DRAFT: 'Чернетка',
    ACTIVE: 'Активний',
    PAUSED: 'Призупинено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Скасовано',
  })[status];

export const rehabilitationErrorMessage = (code?: string): string =>
  ({
    REHABILITATION_PLAN_UPDATE_CONFLICT: 'План уже змінився. Оновіть сторінку та повторіть дію.',
    REHABILITATION_PLAN_INVALID_TRANSITION: 'Ця зміна статусу зараз недоступна.',
    REHABILITATION_PLAN_NOT_EDITABLE:
      'Опубліковану редакцію не можна змінювати. Створіть нову редакцію.',
    REHABILITATION_PLAN_INCOMPLETE:
      'Для активації потрібна щонайменше одна ціль або призначена вправа.',
    REHABILITATION_PLAN_DRAFT_EXISTS: 'Для цього плану вже існує чернетка редакції.',
    REHABILITATION_PLAN_NOT_FOUND: 'План не знайдено або він недоступний у вашій організації.',
    REHABILITATION_GOAL_INVALID_TARGET:
      'Числова ціль має відповідати типу, одиниці та оператору показника.',
    REHABILITATION_GOAL_MEASUREMENT_MISMATCH:
      'Вихідне вимірювання не відповідає пацієнту або показнику цілі.',
    EXERCISE_NOT_FOUND: 'Вправу не знайдено або вона недоступна у вашій організації.',
    EXERCISE_NOT_AVAILABLE: 'Неактивну вправу не можна додати до нової редакції.',
    EXERCISE_PRESCRIPTION_INVALID_DOSAGE:
      'Перевірте дозування, сторону та параметри призначення вправи.',
    FORBIDDEN: 'У вас немає дозволу на цю дію.',
    VALIDATION_FAILED: 'Перевірте заповнені поля та дозування.',
  })[code ?? ''] ?? 'Не вдалося виконати дію. Спробуйте ще раз.';
