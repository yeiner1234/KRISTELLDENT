interface TimeSlotProps {
  time: string;
  available: boolean;
  selected: boolean;
  onSelect: (time: string) => void;
}

function TimeSlot({ time, available, selected, onSelect }: TimeSlotProps) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onSelect(time)}
      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors ${
        !available
          ? 'cursor-not-allowed border-border text-ink-tertiary'
          : selected
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-border text-ink-secondary hover:border-brand-600/40'
      }`}
    >
      {time}
    </button>
  );
}

export default TimeSlot;
