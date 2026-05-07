/**
 * In-memory Supabase mock for unit-testing handlers that read / write the
 * Supabase tables we care about (`user_profiles`, `audit_log`,
 * `webhook_events`, `lifetime_seats`, `subscriptions`).
 *
 * Scope: this is **not** a faithful PostgREST emulator. It implements only
 * the subset of `from(...).select / insert / update / upsert / delete`
 * chains the production code actually uses. Adding more methods is fine,
 * but please keep the surface minimal so tests fail fast when the real
 * code starts using a method we haven't taught the mock about.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

interface QueryState {
  table: string;
  filters: Array<{
    column: string;
    op: "eq" | "is";
    value: unknown;
  }>;
  selectColumns: string | null;
  pendingOp:
    | { kind: "select" }
    | { kind: "insert"; values: Row | Row[] }
    | { kind: "update"; values: Row }
    | { kind: "upsert"; values: Row | Row[]; onConflict?: string }
    | { kind: "delete" }
    | null;
}

export interface SupabaseMockOptions {
  /** Initial table data, keyed by table name. */
  seed?: Record<string, Row[]>;
  /**
   * Per-table override for rpc(). Keyed by RPC name; receives the params
   * object and the in-memory store so the override can read / write.
   */
  rpcs?: Record<
    string,
    (params: Record<string, unknown>, store: Record<string, Row[]>) =>
      | { data: unknown; error: null }
      | { data: null; error: { message: string; code?: string } }
  >;
}

export interface SupabaseMock {
  client: SupabaseClient;
  store: Record<string, Row[]>;
  /** Test-side helper for asserting on inserts / updates. */
  inspect(table: string): Row[];
}

function rowMatches(row: Row, filters: QueryState["filters"]): boolean {
  return filters.every((f) => {
    if (f.op === "eq") return row[f.column] === f.value;
    if (f.op === "is") return row[f.column] === f.value;
    return false;
  });
}

export function createSupabaseMock(opts: SupabaseMockOptions = {}): SupabaseMock {
  const store: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(opts.seed ?? {})) {
    store[k] = v.map((r) => ({ ...r }));
  }

  function buildBuilder(table: string) {
    if (!store[table]) store[table] = [];

    const state: QueryState = {
      table,
      filters: [],
      selectColumns: null,
      pendingOp: null,
    };

    const finalize = () => {
      const op = state.pendingOp;
      const rows = store[table] ?? [];

      if (!op || op.kind === "select") {
        const matched = rows.filter((r) => rowMatches(r, state.filters));
        return { data: matched, error: null as null | { message: string; code?: string } };
      }

      if (op.kind === "insert") {
        const toInsert = Array.isArray(op.values) ? op.values : [op.values];
        // Honour unique columns we actually use:
        //   - webhook_events.stripe_event_id
        //   - lifetime_seats.seat_number / stripe_payment_intent_id
        //   - user_profiles.user_id (PK)
        const uniqueChecks: Record<string, string[]> = {
          webhook_events: ["stripe_event_id"],
          user_profiles: ["user_id"],
          lifetime_seats: ["seat_number", "stripe_payment_intent_id"],
        };
        for (const r of toInsert) {
          const cols = uniqueChecks[table] ?? [];
          for (const col of cols) {
            if (r[col] === undefined || r[col] === null) continue;
            if (rows.some((existing) => existing[col] === r[col])) {
              return {
                data: null,
                error: {
                  code: "23505",
                  message: `duplicate key value violates unique constraint on ${table}.${col}`,
                },
              };
            }
          }
        }
        for (const r of toInsert) rows.push({ ...r });
        return { data: toInsert, error: null };
      }

      if (op.kind === "upsert") {
        const toUpsert = Array.isArray(op.values) ? op.values : [op.values];
        const conflictCol = op.onConflict;
        for (const r of toUpsert) {
          if (conflictCol && r[conflictCol] !== undefined) {
            const idx = rows.findIndex((existing) => existing[conflictCol] === r[conflictCol]);
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...r };
              continue;
            }
          }
          rows.push({ ...r });
        }
        return { data: toUpsert, error: null };
      }

      if (op.kind === "update") {
        const matched = rows.filter((r) => rowMatches(r, state.filters));
        for (const r of matched) Object.assign(r, op.values);
        return { data: matched, error: null };
      }

      if (op.kind === "delete") {
        const remaining = rows.filter((r) => !rowMatches(r, state.filters));
        store[table] = remaining;
        return { data: rows.filter((r) => rowMatches(r, state.filters)), error: null };
      }

      return { data: null, error: null };
    };

    const builder: {
      select: (cols?: string) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      is: (col: string, val: unknown) => typeof builder;
      insert: (values: Row | Row[]) => typeof builder;
      update: (values: Row) => typeof builder;
      upsert: (values: Row | Row[], opts?: { onConflict?: string }) => typeof builder;
      delete: () => typeof builder;
      maybeSingle: () => Promise<{
        data: Row | null;
        error: null | { message: string; code?: string };
      }>;
      single: () => Promise<{
        data: Row | null;
        error: null | { message: string; code?: string };
      }>;
      then: <T>(resolve: (v: { data: Row[] | null; error: null | { message: string; code?: string } }) => T) => Promise<T>;
    } = {
      select(cols?: string) {
        state.selectColumns = cols ?? "*";
        if (!state.pendingOp) state.pendingOp = { kind: "select" };
        return builder;
      },
      eq(col, val) {
        state.filters.push({ column: col, op: "eq", value: val });
        return builder;
      },
      is(col, val) {
        state.filters.push({ column: col, op: "is", value: val });
        return builder;
      },
      insert(values) {
        state.pendingOp = { kind: "insert", values };
        return builder;
      },
      update(values) {
        state.pendingOp = { kind: "update", values };
        return builder;
      },
      upsert(values, upsertOpts) {
        state.pendingOp = {
          kind: "upsert",
          values,
          onConflict: upsertOpts?.onConflict,
        };
        return builder;
      },
      delete() {
        state.pendingOp = { kind: "delete" };
        return builder;
      },
      async maybeSingle() {
        const result = finalize();
        if (result.error) return { data: null, error: result.error };
        const arr = (result.data as Row[]) ?? [];
        return { data: arr[0] ?? null, error: null };
      },
      async single() {
        const result = finalize();
        if (result.error) return { data: null, error: result.error };
        const arr = (result.data as Row[]) ?? [];
        return { data: arr[0] ?? null, error: null };
      },
      // Auto-await as a thenable: `await supabase.from(...).insert(...)`
      then(resolve) {
        const result = finalize();
        const data = Array.isArray(result.data) ? (result.data as Row[]) : null;
        return Promise.resolve(resolve({ data, error: result.error }));
      },
    };

    return builder;
  }

  const client = {
    from(table: string) {
      return buildBuilder(table);
    },
    rpc(name: string, params: Record<string, unknown>) {
      const handler = opts.rpcs?.[name];
      if (!handler) {
        return Promise.resolve({
          data: null,
          error: { message: `unknown rpc: ${name}` },
        });
      }
      return Promise.resolve(handler(params, store));
    },
  } as unknown as SupabaseClient;

  return {
    client,
    store,
    inspect(table) {
      return store[table] ?? [];
    },
  };
}
