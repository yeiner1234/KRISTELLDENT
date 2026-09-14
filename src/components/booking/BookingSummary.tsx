interface BookingSummaryProps {
  patientName: string;
  professionalName: string;
  specialtyName: string;
  date: string;
  time: string;
  reason: string;
}

function BookingSummary({ patientName, professionalName, specialtyName, date, time, reason }: BookingSummaryProps) {
  const rows: Array<[string, string]> = [
    ['Paciente', patientName],
    ['Profesional', professionalName],
    ['Especialidad', specialtyName],
    ['Fecha', date],
    ['Hora', time],
    ['Motivo', reason],
  ];

  return (
    <dl className="divide-y divide-border rounded-2xl border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-5 py-3">
          <dt className="text-sm text-ink-tertiary">{label}</dt>
          <dd className="text-sm font-semibold text-brand-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default BookingSummary;
