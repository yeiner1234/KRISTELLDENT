import { Baby, MoveHorizontal, Scissors, ShieldPlus, Smile, Syringe, type LucideIcon } from 'lucide-react';

export const specialtyIcons: Record<string, LucideIcon> = {
  'sp-general': Smile,
  'sp-ortodoncia': MoveHorizontal,
  'sp-endodoncia': Syringe,
  'sp-periodoncia': ShieldPlus,
  'sp-odontopediatria': Baby,
  'sp-cirugia': Scissors,
};
