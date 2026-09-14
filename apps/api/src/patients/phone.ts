import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type NormalizedPhone = {
  display: string | null;
  normalized: string | null;
};

/**
 * Normalize staff-entered phones to E.164 when possible.
 * Default region UA for national numbers; international (+…) still works.
 */
export function normalizePhone(
  input: string | null | undefined,
  defaultCountry: CountryCode = 'UA',
): NormalizedPhone {
  if (input == null) {
    return { display: null, normalized: null };
  }
  const display = input.trim();
  if (display.length === 0) {
    return { display: null, normalized: null };
  }

  const parsed = parsePhoneNumberFromString(display, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new BadRequestException('Invalid phone number.');
  }

  return {
    display,
    normalized: parsed.format('E.164'),
  };
}
