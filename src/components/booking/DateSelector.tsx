import CalendarPicker from '../common/CalendarPicker';
import { getTodayIsoDate } from '../../utils/date';

interface DateSelectorProps {
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
  return <CalendarPicker selectedDate={selectedDate} onSelect={onSelect} minDate={getTodayIsoDate()} />;
}

export default DateSelector;
