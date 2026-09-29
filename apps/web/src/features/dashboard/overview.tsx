import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';
import { Avatar, PageHeader, SectionHeader } from '@repo/ui/workspace';
import { Stat } from '@repo/ui/components';
import { listPatients } from '../patients/api/patients-api';
import { PatientStatusBadge } from '../patients/components/patient-status-badge';
import { listAppointments } from '../scheduling/api/scheduling-api';
import { AppointmentStatusBadge } from '../scheduling/components/appointment-status-badge';
import { calendarQueryRange, DEFAULT_TIMEZONE, formatSchedulingTime, parseCalendarDate, todayCalendarDate } from '../scheduling/timezone';
import type { WorkAnalyticsSummary } from '@repo/contracts';
import { serverApiFetch } from '../../lib/api/server-api-client';

export async function Overview({ user }: { user: CurrentUserResponse }) {
  const patientsAllowed = hasPermission(user.permissions, PERMISSIONS.PATIENT_READ_ADMIN);
  const scheduleAllowed = hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_READ);
  const today = todayCalendarDate(DEFAULT_TIMEZONE);
  const range = calendarQueryRange('day', parseCalendarDate(today, DEFAULT_TIMEZONE), DEFAULT_TIMEZONE);
  const [patients, schedule, analytics] = await Promise.all([
    patientsAllowed ? listPatients({ page: 1, pageSize: 6, sort: 'updatedAt', sortDir: 'desc', search: '', status: 'ACTIVE', responsiblePractitionerId: '' }).catch(() => null) : null,
    scheduleAllowed ? listAppointments(range).catch(() => null) : null,
    scheduleAllowed ? serverApiFetch<WorkAnalyticsSummary>('/api/v1/work-analytics/summary').catch(() => null) : null,
  ]);
  const appointments = [...(schedule?.items ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return <div className="space-y-8">
    <PageHeader eyebrow={user.organization.name} title="Головна" description={`Вітаємо, ${user.displayName.split(/\s+/)[0]}. Усе важливе для вашого робочого дня — в одному місці.`} actions={scheduleAllowed ? <a href="/app/calendar" className="rc-btn rc-btn-primary">Відкрити календар ↗</a> : null} />
    <div className="overview-grid">
      <section className="overview-schedule"><SectionHeader title="Сьогодні" description={new Intl.DateTimeFormat('uk-UA', { dateStyle: 'full', timeZone: DEFAULT_TIMEZONE }).format(new Date())} action={schedule ? <span className="ui-count">{appointments.length} візитів</span> : null} />
        {!scheduleAllowed ? <p className="overview-empty">Календар недоступний для вашої ролі.</p> : !schedule ? <p role="alert" className="overview-empty">Не вдалося завантажити розклад. <a href="/app" className="text-info underline">Повторити</a></p> : !appointments.length ? <div className="overview-empty"><p className="font-medium text-text-primary">На сьогодні візитів немає</p><p className="mt-2">Перейдіть до календаря, щоб переглянути інші дати.</p></div> : <ol className="mt-6">{appointments.map(item => <li key={item.id}><a className="overview-appointment" href={`/app/calendar?appointment=${item.id}&date=${today}`}><time className="overview-time" dateTime={item.startsAt}>{formatSchedulingTime(item.startsAt, DEFAULT_TIMEZONE)}</time><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.patient.displayName}</p><p className="mt-1 text-xs text-text-secondary">{item.appointmentType?.name ?? 'Візит'} · {item.practitioner.displayName}</p>{item.location && <p className="mt-1 text-xs text-text-secondary">{item.location.name}</p>}</div><AppointmentStatusBadge status={item.status} /></a></li>)}</ol>}
      </section>
      <section className="overview-patients"><SectionHeader title="Активні пацієнти" description="Нещодавно оновлені картки" action={patients ? <span className="ui-count">{patients.total}</span> : null} />
        {!patientsAllowed ? <p className="overview-empty">Перегляд карток недоступний для вашої ролі.</p> : !patients ? <p role="alert" className="overview-empty">Не вдалося завантажити пацієнтів. <a href="/app" className="text-info underline">Повторити</a></p> : !patients.items.length ? <p className="overview-empty">Активних пацієнтів ще немає.</p> : <ul className="mt-5">{patients.items.map(patient => <li key={patient.id}><a href={`/app/patients/${patient.id}`} className="overview-patient"><Avatar name={patient.fullName} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{patient.fullName}</p><p className="truncate text-xs text-text-secondary">{patient.responsiblePractitioner?.displayName ?? 'Фахівця не призначено'}</p></div><PatientStatusBadge status={patient.status} /></a></li>)}</ul>}
        {patientsAllowed && <a href="/app/patients" className="mt-5 inline-flex text-sm text-info">Усі пацієнти →</a>}
      </section>
    </div>
    <div className="overview-grid overview-grid-bottom">
      <section className="overview-patients"><SectionHeader title="Моє навантаження" description="Фактично проведені візити" />
        <div className="grid gap-6 md:grid-cols-2"><WorkloadPeriod title="Цей тиждень" data={analytics?.week} /><WorkloadPeriod title="Цей місяць" data={analytics?.month} /></div>
      </section>
    </div>
  </div>;
}

function WorkloadPeriod({ title, data }: { title: string; data: WorkAnalyticsSummary['week'] | undefined }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{title}</p><dl className="overview-metrics mt-3"><Stat label="Візити" value={data?.completedVisits ?? '—'} /><Stat label="Фізична терапія" value={data ? `${Math.floor(data.therapyMinutes / 60)} год ${data.therapyMinutes % 60} хв` : '—'} /><Stat label="Дохід" value={data ? `${(data.revenueMinor / 100).toLocaleString('uk-UA')} ₴` : '—'} /></dl></div>;
}
