import type { MeasurementTrendSeries } from '@repo/contracts';

export function MeasurementChart({ series }: { series: MeasurementTrendSeries }) {
  const values = series.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = series.points.map((point, index) => `${20 + (index * 260) / Math.max(1, series.points.length - 1)},${100 - ((point.value - min) / range) * 70}`).join(' ');
  return (
    <div className="ui-surface p-5">
      <p className="rc-kicker">Measurement trend</p><h3 className="mt-2 text-lg font-semibold">{series.definition.name}</h3>
      <p className="text-xs text-text-secondary">{[series.region, series.laterality, series.unit].filter(Boolean).join(' • ') || 'Без додаткового групування'}</p>
      <svg viewBox="0 0 300 120" className="mt-3 h-32 w-full" role="img" aria-label={`Графік ${series.definition.name}: ${series.points.length} точок`}>
        <line x1="20" y1="100" x2="280" y2="100" stroke="currentColor" className="text-border" />
        <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-info" points={points} />
        {series.points.map((point, index) => <circle key={point.id} cx={20 + (index * 260) / Math.max(1, series.points.length - 1)} cy={100 - ((point.value - min) / range) * 70} r="4" fill="currentColor" className="text-info"><title>{`${new Date(point.performedAt).toLocaleDateString('uk-UA')}: ${point.value} ${series.unit ?? ''}`}</title></circle>)}
      </svg>
      <p className="text-sm">Базове: <strong>{series.baseline.value}</strong> · Поточне: <strong>{series.latest.value}</strong> · Δ <strong>{new Intl.NumberFormat('uk-UA', { signDisplay: 'exceptZero', maximumFractionDigits: 2 }).format(series.deltaFromBaseline)}</strong> {series.unit ?? ''}</p>
      <details className="mt-3"><summary className="cursor-pointer text-sm text-info">Табличне представлення</summary><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-1">Дата</th><th>Значення</th><th>Контекст</th></tr></thead><tbody>{series.points.map((point) => <tr key={point.id} className="border-t border-border"><td className="py-1">{new Date(point.performedAt).toLocaleDateString('uk-UA')}</td><td>{point.value} {series.unit ?? ''}</td><td><a className="text-info underline" href={`/app/assessments/${point.assessmentId}`}>Оцінювання</a></td></tr>)}</tbody></table></div></details>
    </div>
  );
}
