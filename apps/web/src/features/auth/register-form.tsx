'use client';
import { useState } from 'react';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (fields.password !== fields.confirmPassword) { setError('Паролі повинні збігатися.'); return; }
    delete fields.confirmPassword;
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/local-auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      if (!response.ok) { setError(response.status === 429 ? 'Забагато спроб. Спробуйте пізніше.' : 'Не вдалося створити акаунт. Перевірте дані та спробуйте ще раз. Для приєднання до наявної команди потрібне запрошення.'); return; }
      window.location.assign('/');
    } catch { setError('Немає зв’язку із сервером. Спробуйте ще раз.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="auth-form auth-register-form mt-8 space-y-4" aria-busy={pending}>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block text-sm font-medium">Ім’я<input name="firstName" required maxLength={100} autoComplete="given-name" className="field" /></label>
      <label className="block text-sm font-medium">Прізвище<input name="lastName" required maxLength={100} autoComplete="family-name" className="field" /></label>
      <label className="block text-sm font-medium">Назва організації<input name="organizationName" required maxLength={200} autoComplete="organization" className="field" /></label>
      <label className="block text-sm font-medium">Роль<select name="role" defaultValue="REHABILITATION_SPECIALIST" className="field"><option value="REHABILITATION_SPECIALIST">Реабілітолог</option><option value="ORGANIZATION_ADMIN">Адміністратор організації</option></select></label>
      <label className="block text-sm font-medium">Електронна пошта<input name="email" required type="email" maxLength={254} autoComplete="email" className="field" /></label>
      <label className="block text-sm font-medium">Пароль<input name="password" required minLength={10} maxLength={128} type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby="password-policy" className="field" /></label>
      <p id="password-policy" className="text-sm text-text-secondary">Від 10 до 128 символів.</p>
      <label className="block text-sm font-medium">Підтвердьте пароль<input name="confirmPassword" required minLength={10} maxLength={128} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="field" /></label>
      <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="auth-password-toggle text-sm underline">{showPassword ? 'Приховати паролі' : 'Показати паролі'}</button>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="rc-btn rc-btn-primary w-full">{pending ? 'Створення…' : 'Створити акаунт'}</button>
    </fieldset>
    <a href="/login" className="auth-form-link block text-center text-sm text-text-secondary underline">Вже маєте акаунт? Увійти</a>
  </form>;
}
