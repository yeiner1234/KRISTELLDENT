import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  minDate?: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const weekdayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function CalendarPicker({ selectedDate, onSelect, minDate }: CalendarPickerProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const minBoundary = minDate ? new Date(`${minDate}T00:00:00`) : today;
  const minBoundaryStart = new Date(minBoundary.getFullYear(), minBoundary.getMonth(), minBoundary.getDate());

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-lg p-1.5 text-ink-tertiary hover:bg-tint"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold capitalize text-brand-900">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-lg p-1.5 text-ink-tertiary hover:bg-tint"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-tertiary">
        {weekdayLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`empty-${index}`} />;
          }

          const cellDate = new Date(year, month, day);
          const iso = toIsoDate(cellDate);
          const isPast = cellDate < minBoundaryStart;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-lg text-sm transition-colors ${
                isPast
                  ? 'cursor-not-allowed text-ink-tertiary'
                  : isSelected
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-secondary hover:bg-brand-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarPicker;
