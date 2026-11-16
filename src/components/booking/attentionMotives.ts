import { Baby, CheckCircle2, Droplet, Frown, HelpCircle, MoveHorizontal, Siren, Sparkles, type LucideIcon } from 'lucide-react';

export interface AttentionMotive {
  id: string;
  label: string;
  icon: LucideIcon;
  // Nombres de especialidad en orden de preferencia; se comparan sin tildes
  // ni mayúsculas (ver findSpecialtyByNames). Odontología General es el
  // respaldo: siempre puede evaluar y derivar.
  recommendedSpecialtyNames: string[];
}

const GENERAL = 'Odontología General';

export const attentionMotives: AttentionMotive[] = [
  { id: 'pain', label: 'Tengo dolor o sensibilidad', icon: Frown, recommendedSpecialtyNames: ['Endodoncia', GENERAL] },
  { id: 'gums', label: 'Me sangran o molestan las encías', icon: Droplet, recommendedSpecialtyNames: ['Periodoncia', GENERAL] },
  { id: 'appearance', label: 'Quiero mejorar la apariencia de mis dientes', icon: Sparkles, recommendedSpecialtyNames: [GENERAL] },
  { id: 'alignment', label: 'Quiero corregir la posición de mis dientes', icon: MoveHorizontal, recommendedSpecialtyNames: ['Ortodoncia', GENERAL] },
  { id: 'child', label: 'Es una consulta para un niño', icon: Baby, recommendedSpecialtyNames: ['Odontopediatría', GENERAL] },
  { id: 'cleaning', label: 'Quiero una limpieza o revisión', icon: CheckCircle2, recommendedSpecialtyNames: [GENERAL] },
  { id: 'urgent', label: 'Tengo una urgencia dental', icon: Siren, recommendedSpecialtyNames: ['Endodoncia', 'Cirugía Dental', GENERAL] },
  { id: 'unsure', label: 'No estoy seguro / Otro motivo', icon: HelpCircle, recommendedSpecialtyNames: [GENERAL] },
];
