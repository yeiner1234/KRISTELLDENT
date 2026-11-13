# Pruebas

- `npm test`: corre todas las pruebas una vez (Vitest + jsdom).
- `npm run test:watch`: modo observación.
- Las pruebas viven junto al código que prueban: `*.test.ts` / `*.test.tsx`.
- `describe`, `it`, `expect` y `vi` se importan desde `vitest` (no hay globals).
- `setup.ts` carga los matchers de jest-dom (`toBeDisabled`, `toBeInTheDocument`, ...) y limpia el DOM después de cada prueba.

## Mockear Supabase

Ninguna prueba debe llamar a la red. Las que dependan de Supabase mockean `src/lib/supabase`
con `vi.mock` (la ruta es relativa al archivo de prueba; desde `src/services/` es `'../lib/supabase'`).

```ts
// src/services/ejemploService.test.ts
// import { beforeEach, describe, expect, it, vi } from 'vitest';
// import { supabase } from '../lib/supabase';
// import { getBranches, getAvailableSlots } from './ejemploService';
//
// vi.mock('../lib/supabase', () => ({
//   supabase: {
//     from: vi.fn(),
//     rpc: vi.fn(),
//   },
// }));
//
// describe('ejemploService', () => {
//   beforeEach(() => {
//     vi.clearAllMocks();
//   });
//
//   it('lee sedes con supabase.from(...).select(...)', async () => {
//     // Cada método encadenado devuelve el siguiente eslabón; el último resuelve { data, error }.
//     const select = vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Sede Centro' }], error: null });
//     vi.mocked(supabase.from).mockReturnValue({ select } as never);
//
//     const branches = await getBranches();
//
//     expect(supabase.from).toHaveBeenCalledWith('branches');
//     expect(select).toHaveBeenCalled();
//     expect(branches).toEqual([{ id: 1, name: 'Sede Centro' }]);
//   });
//
//   it('consulta horarios con supabase.rpc(...)', async () => {
//     vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ slot_start: '09:00' }], error: null } as never);
//
//     const slots = await getAvailableSlots({ professionalId: 'p1', date: '2026-11-20' });
//
//     expect(supabase.rpc).toHaveBeenCalledWith('get_available_slots', expect.any(Object));
//     expect(slots).toEqual([{ slot_start: '09:00' }]);
//   });
//
//   it('propaga el error de Supabase', async () => {
//     vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
//     await expect(getAvailableSlots({ professionalId: 'p1', date: '2026-11-20' })).rejects.toThrow();
//   });
// });
```

Si la consulta encadena más métodos (`.select().eq().order()`), cada uno debe devolver un objeto
con el siguiente: `{ select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data, error: null }) })) })) }`.
