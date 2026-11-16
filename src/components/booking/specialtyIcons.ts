import { Baby, MoveHorizontal, Scissors, ShieldPlus, Smile, Syringe, type LucideIcon } from 'lucide-react';
import { normalizeText } from '../../utils/specialtyMatch';

// Las especialidades se identifican con UUID en la base: el icono se elige
// por un fragmento del nombre normalizado (sin tildes ni mayúsculas).
const ICONS_BY_NAME: [string, LucideIcon][] = [
  ['ortodon', MoveHorizontal],
  ['endodon', Syringe],
  ['periodon', ShieldPlus],
  ['pediatr', Baby],
  ['cirug', Scissors],
  ['general', Smile],
];

export function getSpecialtyIcon(name: string): LucideIcon {
  const normalized = normalizeText(name);
  return ICONS_BY_NAME.find(([fragment]) => normalized.includes(fragment))?.[1] ?? Smile;
}
