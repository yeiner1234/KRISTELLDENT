import type { AccentTone } from '../../utils/accentTone';

export interface AccentClasses {
  // Cuadro del icono.
  tile: string;
  // Franja de color arriba de una tarjeta.
  stripe: string;
  // Fondo suave (encabezados de grupo, recuadros).
  soft: string;
  // Texto y borde de acento.
  text: string;
  border: string;
  // Botón o pestaña llenos.
  solid: string;
}

// Clases completas (no armadas por partes) para que Tailwind las genere.
export const accentClasses: Record<AccentTone, AccentClasses> = {
  teal: {
    tile: 'bg-gradient-to-br from-brand-600 to-kd-aqua-500 text-white shadow-[0_6px_14px_rgba(15,123,134,0.28)]',
    stripe: 'bg-gradient-to-r from-brand-600 to-kd-aqua-500',
    soft: 'bg-adm-accent-soft',
    text: 'text-brand-700',
    border: 'border-adm-accent-line',
    solid: 'border-brand-600 bg-brand-600 text-white',
  },
  pink: {
    tile: 'bg-gradient-to-br from-kd-pink-500 to-kd-pink-300 text-white shadow-[0_6px_14px_rgba(224,56,127,0.28)]',
    stripe: 'bg-gradient-to-r from-kd-pink-500 to-kd-pink-300',
    soft: 'bg-kd-pink-50',
    text: 'text-kd-pink-700',
    border: 'border-kd-pink-100',
    solid: 'border-kd-pink-500 bg-kd-pink-500 text-white',
  },
  aqua: {
    tile: 'bg-gradient-to-br from-kd-aqua-500 to-kd-aqua-300 text-white shadow-[0_6px_14px_rgba(43,184,196,0.3)]',
    stripe: 'bg-gradient-to-r from-kd-aqua-500 to-kd-aqua-300',
    soft: 'bg-kd-aqua-50',
    text: 'text-kd-aqua-700',
    border: 'border-kd-aqua-100',
    solid: 'border-kd-aqua-500 bg-kd-aqua-500 text-white',
  },
  caramel: {
    tile: 'bg-gradient-to-br from-kd-caramel-500 to-kd-caramel-300 text-white shadow-[0_6px_14px_rgba(200,136,104,0.3)]',
    stripe: 'bg-gradient-to-r from-kd-caramel-500 to-kd-caramel-300',
    soft: 'bg-kd-caramel-50',
    text: 'text-kd-caramel-700',
    border: 'border-kd-caramel-100',
    solid: 'border-kd-caramel-500 bg-kd-caramel-500 text-white',
  },
};

// Tono apagado para lo inactivo.
export const mutedAccent: AccentClasses = {
  tile: 'bg-adm-line-faint text-adm-ink-200',
  stripe: 'bg-adm-line-card',
  soft: 'bg-adm-line-faint',
  text: 'text-adm-ink-400',
  border: 'border-adm-line-card',
  solid: 'border-adm-ink-300 bg-adm-ink-300 text-white',
};
