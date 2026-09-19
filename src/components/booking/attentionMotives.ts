import { Baby, CheckCircle2, Droplet, Frown, HelpCircle, MoveHorizontal, Siren, Sparkles, type LucideIcon } from 'lucide-react';

export interface AttentionMotive {
  id: string;
  label: string;
  icon: LucideIcon;
  recommendedSpecialtyId: string;
}

export const attentionMotives: AttentionMotive[] = [
  { id: 'pain', label: 'Tengo dolor o sensibilidad', icon: Frown, recommendedSpecialtyId: 'sp-endodoncia' },
  { id: 'gums', label: 'Me sangran o molestan las encías', icon: Droplet, recommendedSpecialtyId: 'sp-periodoncia' },
  { id: 'appearance', label: 'Quiero mejorar la apariencia de mis dientes', icon: Sparkles, recommendedSpecialtyId: 'sp-general' },
  { id: 'alignment', label: 'Quiero corregir la posición de mis dientes', icon: MoveHorizontal, recommendedSpecialtyId: 'sp-ortodoncia' },
  { id: 'child', label: 'Es una consulta para un niño', icon: Baby, recommendedSpecialtyId: 'sp-odontopediatria' },
  { id: 'cleaning', label: 'Quiero una limpieza o revisión', icon: CheckCircle2, recommendedSpecialtyId: 'sp-general' },
  { id: 'urgent', label: 'Tengo una urgencia dental', icon: Siren, recommendedSpecialtyId: 'sp-endodoncia' },
  { id: 'unsure', label: 'No estoy seguro / Otro motivo', icon: HelpCircle, recommendedSpecialtyId: 'sp-general' },
];
