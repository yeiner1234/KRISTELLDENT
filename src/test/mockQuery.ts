import { vi, type Mock } from 'vitest';

export interface QueryCall {
  method: string;
  args: unknown[];
}

export interface QueryResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

const CHAIN_METHODS = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'gte', 'lte', 'order', 'single', 'maybeSingle'] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export type MockQuery = Record<ChainMethod, Mock> & {
  calls: QueryCall[];
  then: Promise<QueryResult>['then'];
};

/**
 * Imita el query builder de Supabase: cada método encadenado devuelve el mismo
 * objeto y registra la llamada; al hacer `await` resuelve `result`. Si `result`
 * es una función, recibe las llamadas registradas, para responder según la
 * operación (select, insert, delete...).
 */
export function mockQuery(result: QueryResult | ((calls: QueryCall[]) => QueryResult) = {}): MockQuery {
  const calls: QueryCall[] = [];
  const builder = { calls } as MockQuery;

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }

  builder.then = (onFulfilled, onRejected) => {
    const resolved = typeof result === 'function' ? result(calls) : result;
    return Promise.resolve({ data: null, error: null, ...resolved }).then(onFulfilled, onRejected);
  };

  return builder;
}

/** Primera llamada registrada con ese método, o undefined. */
export function findCall(query: MockQuery, method: ChainMethod): QueryCall | undefined {
  return query.calls.find((call) => call.method === method);
}
