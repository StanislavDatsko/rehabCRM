import { DailyReportForm } from '../../../features/patient-portal/daily-report-form';
import { PageHeader } from '@repo/ui/workspace';
export default function DailyReportPage() { return <div className="space-y-6"><PageHeader eyebrow="Щоденна турбота" title="Щоденний звіт" description="0 — немає, 10 — максимум. Біль і втома: більше означає сильніше." /><div className="ui-filter-bar"><DailyReportForm /></div></div>; }
