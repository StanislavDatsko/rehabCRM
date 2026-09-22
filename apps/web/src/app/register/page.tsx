import { RegisterForm } from '../../features/auth/register-form';
import { AuthLayout } from '../../features/auth/auth-layout';
import { serverApiFetch } from '../../lib/api/server-api-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function RegisterPage() {
  const session = await serverApiFetch<{ id: string }>('/api/v1/auth/me').catch(() => null);
  if (session) redirect('/app');
  return <AuthLayout title="Ваш простір для практики" description="Створіть обліковий запис адміністратора й організацію, щоб розпочати роботу команди."><RegisterForm /></AuthLayout>;
}
