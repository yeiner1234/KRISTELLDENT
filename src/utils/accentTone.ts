import { normalizeText } from './specialtyMatch';

// Colores de acento del panel: el de la marca y los del logo.
export const ACCENT_TONES = ['teal', 'pink', 'aqua', 'caramel'] as const;
export type AccentTone = (typeof ACCENT_TONES)[number];

// Color fijo para un nombre (especialidad, sede...): el mismo nombre siempre
// sale del mismo color en todas las pantallas.
export function accentToneFor(name: string): AccentTone {
  let hash = 0;
  for (const char of normalizeText(name)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return ACCENT_TONES[hash % ACCENT_TONES.length];
}
