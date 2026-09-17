export function safeReturnTo(value: string | null | undefined): string {
  if (!value || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '\\' || char === '%')) return '/';
  return /^\/invite\/[A-Za-z0-9_-]+$/.test(value) ? value : '/';
}
