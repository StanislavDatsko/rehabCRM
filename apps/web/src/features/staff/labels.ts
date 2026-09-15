import type { StaffRole } from '@repo/contracts';

export function staffRoleLabel(role: StaffRole): string {
  return {
    PATIENT: 'Пацієнт',
    ORGANIZATION_ADMIN: 'Адміністратор організації',
    RECEPTIONIST: 'Реєстратор',
    REHABILITATION_SPECIALIST: 'Фахівець з реабілітації',
    SYSTEM_ADMIN: 'Системний адміністратор',
  }[role];
}

export function staffErrorMessage(code?: string): string {
  switch (code) {
    case 'STAFF_NOT_FOUND':
      return 'Працівника не знайдено.';
    case 'STAFF_EMAIL_CONFLICT':
      return 'Обліковий запис із цією email-адресою вже існує.';
    case 'STAFF_LAST_ADMIN_REQUIRED':
      return 'В організації має залишитися щонайменше один активний адміністратор.';
    case 'STAFF_SELF_DISABLE_FORBIDDEN':
      return 'Власний обліковий запис не можна вимкнути.';
    case 'STAFF_UPDATE_CONFLICT':
      return 'Дані вже змінено. Оновіть сторінку й повторіть дію.';
    case 'STAFF_IDENTITY_UNAVAILABLE':
    case 'STAFF_PROVISIONING_FAILED':
      return 'Сервіс ідентифікації недоступний. Спробуйте пізніше.';
    case 'FORBIDDEN':
      return 'Недостатньо прав для цієї дії.';
    case 'VALIDATION_FAILED':
      return 'Перевірте введені дані.';
    default:
      return 'Не вдалося виконати дію. Спробуйте ще раз.';
  }
}
