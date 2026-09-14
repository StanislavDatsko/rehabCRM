'use client';

import { Button } from '@repo/ui/button';
import { t } from '../../i18n/messages';
import { startStaffLogin } from './actions';

export function LoginButton() {
  return (
    <form action={startStaffLogin}>
      <Button type="submit">{t('loginAction')}</Button>
    </form>
  );
}
