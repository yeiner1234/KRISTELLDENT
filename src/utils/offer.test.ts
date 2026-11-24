import { describe, expect, it } from 'vitest';
import { professionalNames } from './offer';
import type { OfferProfessional, ServiceOfferStatus } from '../types/Offer';

const professional = (overrides: Partial<OfferProfessional>): OfferProfessional => ({
  id: 'p',
  fullName: 'ANali',
  active: true,
  hasSchedule: true,
  bookable: true,
  ...overrides,
});

const row = (professionals: OfferProfessional[]) => ({ professionals }) as ServiceOfferStatus;

describe('professionalNames', () => {
  it('sin profesionales asignadas', () => {
    expect(professionalNames(row([]))).toBe('—');
  });

  it('marca a la desactivada y a la que no tiene horario en la sede', () => {
    expect(
      professionalNames(
        row([
          professional({ fullName: 'ANali', hasSchedule: false, bookable: false }),
          professional({ fullName: 'Bea', active: false, bookable: false }),
          professional({ fullName: 'Carla' }),
        ]),
      ),
    ).toBe('ANali (sin horario aquí), Bea (desactivada), Carla');
  });
});
