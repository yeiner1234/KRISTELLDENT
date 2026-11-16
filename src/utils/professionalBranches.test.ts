import { describe, expect, it } from 'vitest';
import { activeBranchesOf } from './professionalBranches';

const branches = [
  { id: 'bagua', name: 'Bagua', active: false },
  { id: 'chacha', name: 'Chachapoyas', active: true },
  { id: 'chiclayo', name: 'Chiclayo', active: true },
];

describe('activeBranchesOf', () => {
  it('devuelve solo las sedes activas asignadas a la profesional', () => {
    expect(activeBranchesOf(['bagua', 'chacha'], branches)).toEqual([{ id: 'chacha', name: 'Chachapoyas' }]);
  });

  it('respeta el orden de la lista de sedes', () => {
    expect(activeBranchesOf(['chiclayo', 'chacha'], branches).map((branch) => branch.id)).toEqual(['chacha', 'chiclayo']);
  });

  it('sin sedes activas devuelve una lista vacía', () => {
    expect(activeBranchesOf(['bagua'], branches)).toEqual([]);
  });
});
