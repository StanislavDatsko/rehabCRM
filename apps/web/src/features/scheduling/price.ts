/** Price in UAH: null = not set, 0 = free. */
export function formatPrice(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  if (amount === 0) return 'Безкоштовно';
  return `${new Intl.NumberFormat('uk-UA').format(amount)} ₴`;
}

export const PRICE_PRESET_LABELS: Record<number, string> = {
  300: 'пільгова',
  500: 'стандартна',
};
