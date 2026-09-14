export interface TimeSlotOption {
  time: string;
  available: boolean;
}

export interface Schedule {
  professionalId: string;
  date: string;
  slots: TimeSlotOption[];
}
