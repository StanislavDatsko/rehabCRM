/**
 * Derive age from a calendar date string (YYYY-MM-DD) without timezone shifts.
 * Never parse DOB via `new Date('YYYY-MM-DD')` (UTC midnight).
 */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!dateOfBirth) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const localBirth = new Date(year, month - 1, day);
  if (
    localBirth.getFullYear() !== year ||
    localBirth.getMonth() !== month - 1 ||
    localBirth.getDate() !== day
  ) {
    return null;
  }

  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (localBirth > todayLocal) {
    return null;
  }

  let age = todayLocal.getFullYear() - year;
  const birthdayPassed =
    todayLocal.getMonth() > month - 1 ||
    (todayLocal.getMonth() === month - 1 && todayLocal.getDate() >= day);
  if (!birthdayPassed) {
    age -= 1;
  }
  if (age < 0 || age > 150) {
    return null;
  }
  return age;
}

/** Format YYYY-MM-DD for display without timezone conversion. */
export function formatDateOfBirth(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) {
    return null;
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}
