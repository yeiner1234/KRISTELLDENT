// Las especialidades se identifican con UUID en la base, así que el motivo de
// atención las busca por nombre: "Odontopediatria" y "odontopediatría" valen igual.
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Recorre los candidatos en orden; para cada uno, primero el nombre exacto y
// luego uno que lo contenga. Gana el primer candidato que encuentre algo.
export function findSpecialtyByNames<T extends { name: string }>(specialties: T[], names: string[]): T | null {
  for (const name of names) {
    const target = normalizeText(name);
    const exact = specialties.find((specialty) => normalizeText(specialty.name) === target);
    if (exact) return exact;
    const partial = specialties.find((specialty) => normalizeText(specialty.name).includes(target));
    if (partial) return partial;
  }
  return null;
}

// Misma clave que public.name_key() en la base: así la pantalla avisa de un
// duplicado antes de que la base lo rechace.
export function nameKey(text: string): string {
  return normalizeText(text).replace(/\s+/g, ' ');
}

export function isSameSpecialtyName(a: string, b: string): boolean {
  return nameKey(a) === nameKey(b);
}

// Distancia de edición (inserciones, borrados y cambios de una letra).
function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

const MIN_LENGTH = 3;
const MAX_TYPOS = 2;

// "¿Quisiste decir Ortodoncia?": igual sin tildes ni mayúsculas, una contiene
// a la otra, o solo hay un par de letras de diferencia.
export function similarSpecialties<T extends { name: string }>(name: string, specialties: T[]): T[] {
  const key = nameKey(name);
  if (key.length < MIN_LENGTH) return [];

  return specialties.filter((specialty) => {
    const other = nameKey(specialty.name);
    return other === key || other.includes(key) || key.includes(other) || editDistance(other, key) <= MAX_TYPOS;
  });
}
