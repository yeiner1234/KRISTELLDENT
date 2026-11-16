import { describe, expect, it } from 'vitest';
import { candidateProfessionals, professionalsForBooking } from './bookingCandidates';
import type { Professional } from '../types/Professional';

function professional(id: string, specialtyIds: string[], branchIds: string[]): Professional {
  return { id, fullName: id, role: null, bio: null, active: true, specialtyIds, branchIds, serviceIds: [] };
}

const anaSedeA = professional('ana', ['endo'], ['A']);
const betySedeB = professional('bety', ['endo'], ['B']);
const carlaAmbas = professional('carla', ['endo', 'general'], ['A', 'B']);
const dianaOtraEspecialidad = professional('diana', ['perio'], ['A']);
const all = [anaSedeA, betySedeB, carlaAmbas, dianaOtraEspecialidad];

describe('professionalsForBooking', () => {
  it('en la sede A no ofrece a quien solo atiende en la sede B', () => {
    expect(professionalsForBooking(all, 'endo', 'A').map((p) => p.id)).toEqual(['ana', 'carla']);
  });

  it('excluye a quien no tiene la especialidad', () => {
    expect(professionalsForBooking(all, 'perio', 'B')).toEqual([]);
  });
});

describe('candidateProfessionals', () => {
  it('con cualquier profesional devuelve los de la especialidad en esa sede', () => {
    expect(
      candidateProfessionals(all, { specialtyId: 'endo', branchId: 'B', professionalId: 'any' }).map((p) => p.id),
    ).toEqual(['bety', 'carla']);
  });

  it('con un profesional elegido lo devuelve solo si atiende en esa sede', () => {
    expect(candidateProfessionals(all, { specialtyId: 'endo', branchId: 'A', professionalId: 'carla' })).toEqual([carlaAmbas]);
    expect(candidateProfessionals(all, { specialtyId: 'endo', branchId: 'A', professionalId: 'bety' })).toEqual([]);
  });
});
