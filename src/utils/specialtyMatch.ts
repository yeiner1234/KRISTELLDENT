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
