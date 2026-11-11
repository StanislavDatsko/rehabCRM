'use client';

import { useRouter } from 'next/navigation';

/** Month picker for the visit history; changing it reloads the tab for that month. */
export function VisitMonthSelect({
  patientId,
  value,
  options,
  total,
}: {
  patientId: string;
  /** "YYYY-MM" or empty for all months. */
  value: string;
  options: { key: string; label: string; count: number }[];
  total: number;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-3 text-sm text-text-secondary">
      Місяць
      <select
        value={value}
        onChange={(event) => {
          const month = event.target.value;
          router.push(`/app/patients/${patientId}?tab=appointments${month ? `&visitMonth=${month}` : ''}`);
        }}
        className="field min-w-56"
        style={{ width: "auto" }}
        aria-label="Місяць візитів"
      >
        <option value="">Усі місяці ({total})</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}
