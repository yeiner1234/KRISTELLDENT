export interface BookingSummaryRow {
  label: string;
  value: string;
}

interface BookingSummaryProps {
  title?: string;
  rows: BookingSummaryRow[];
}

function BookingSummary({ title, rows }: BookingSummaryProps) {
  return (
    <div className="rounded-2xl border" style={{ borderColor: '#edf1f4' }}>
      {title && (
        <p className="border-b px-5 py-3 text-sm font-semibold text-brand-900" style={{ borderColor: '#edf1f4' }}>
          {title}
        </p>
      )}
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b px-5 py-3 last:border-b-0"
            style={{ borderColor: '#edf1f4' }}
          >
            <dt className="text-[13px] text-ink-tertiary">{row.label}</dt>
            <dd className="text-right text-sm font-medium text-brand-900">{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default BookingSummary;
