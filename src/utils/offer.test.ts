import { describe, expect, it } from 'vitest';
import { professionalNames } from './offer';
import type { OfferProfessional, ServiceOfferStatus } from '../types/Offer';

const professional = (overrides: Partial<OfferProfessional>): OfferProfessional => ({
  id: 'p',
  fullName: 'ANali',
  active: true,
  accountActive: true,
  recordActive: true,
  hasSchedule: true,
  bookable: true,
  ...overrides,
});

const row = (professionals: OfferProfessional[]) => ({ professionals }) as ServiceOfferStatus;

describe('professionalNames', () => {
  it('sin profesionales asignadas', () => {
    expect(professionalNames(row([]))).toBe('—');
  });

  it('dice exactamente qué falla: cuenta, ficha u horario', () => {
    expect(
      professionalNames(
        row([
          professional({ fullName: 'ANali', hasSchedule: false, bookable: false }),
          professional({ fullName: 'Bea', active: false, accountActive: false, bookable: false }),
          professional({ fullName: 'Carla', active: false, recordActive: false, bookable: false }),
          professional({ fullName: 'Dina' }),
        ]),
      ),
    ).toBe('ANali (sin horario aquí), Bea (cuenta desactivada en Equipo), Carla (ficha desactivada), Dina');
  });
});
