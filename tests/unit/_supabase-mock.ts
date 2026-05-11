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
    op: "eq" | "is" | "gt" | "lt" | "gte" | "lte";
    value: unknown;
  }>;
  selectColumns: string | null;
  /** When `select(..., { count: "exact", head: true })` is used. */
  countMode: "exact" | null;
  headOnly: boolean;
  pendingOp:
    | { kind: "select" }
    | { kind: "insert"; values: Row | Row[] }
    | { kind: "update"; values: Row }
    | {
        kind: "upsert";
        values: Row | Row[];
        onConflict?: string;
        ignoreDuplicates?: boolean;
      }
    | { kind: "delete" }
    | null;
  orderBy: { column: string; ascending: boolean } | null;
  limit: number | null;
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

function compareForOrder(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  // ISO 8601 timestamps and most other strings compare correctly
  // lexicographically.
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function rowMatches(row: Row, filters: QueryState["filters"]): boolean {
  return filters.every((f) => {
    if (f.op === "eq") return row[f.column] === f.value;
    if (f.op === "is") return row[f.column] === f.value;
    if (f.op === "gt") return compareForOrder(row[f.column], f.value) > 0;
    if (f.op === "lt") return compareForOrder(row[f.column], f.value) < 0;
    if (f.op === "gte") return compareForOrder(row[f.column], f.value) >= 0;
    if (f.op === "lte") return compareForOrder(row[f.column], f.value) <= 0;
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
      countMode: null,
      headOnly: false,
      pendingOp: null,
      orderBy: null,
      limit: null,
    };

    const finalize = () => {
      const op = state.pendingOp;
      const rows = store[table] ?? [];

      if (!op || op.kind === "select") {
        let matched = rows.filter((r) => rowMatches(r, state.filters));
        if (state.orderBy) {
          const { column, ascending } = state.orderBy;
          matched = [...matched].sort((a, b) =>
            ascending
              ? compareForOrder(a[column], b[column])
              : compareForOrder(b[column], a[column]),
          );
        }
        if (state.limit !== null) {
          matched = matched.slice(0, state.limit);
        }
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
        const ignoreDuplicates = op.ignoreDuplicates === true;
        for (const r of toUpsert) {
          if (conflictCol && r[conflictCol] !== undefined) {
            const idx = rows.findIndex((existing) => existing[conflictCol] === r[conflictCol]);
            if (idx >= 0) {
              if (ignoreDuplicates) continue;
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

    type CountResult = {
      data: Row[] | null;
      count: number | null;
      error: null | { message: string; code?: string };
    };

    const builder: {
      select: (
        cols?: string,
        opts?: { count?: "exact"; head?: boolean },
      ) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      is: (col: string, val: unknown) => typeof builder;
      gt: (col: string, val: unknown) => typeof builder;
      lt: (col: string, val: unknown) => typeof builder;
      gte: (col: string, val: unknown) => typeof builder;
      lte: (col: string, val: unknown) => typeof builder;
      insert: (values: Row | Row[]) => typeof builder;
      update: (values: Row) => typeof builder;
      upsert: (
        values: Row | Row[],
        opts?: { onConflict?: string; ignoreDuplicates?: boolean },
      ) => typeof builder;
      delete: () => typeof builder;
      order: (col: string, opts?: { ascending?: boolean }) => typeof builder;
      limit: (n: number) => typeof builder;
      maybeSingle: () => Promise<{
        data: Row | null;
        error: null | { message: string; code?: string };
      }>;
      single: () => Promise<{
        data: Row | null;
        error: null | { message: string; code?: string };
      }>;
      then: <T>(resolve: (v: CountResult) => T) => Promise<T>;
    } = {
      select(cols, opts) {
        state.selectColumns = cols ?? "*";
        if (opts?.count === "exact") state.countMode = "exact";
        if (opts?.head === true) state.headOnly = true;
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
      gt(col, val) {
        state.filters.push({ column: col, op: "gt", value: val });
        return builder;
      },
      lt(col, val) {
        state.filters.push({ column: col, op: "lt", value: val });
        return builder;
      },
      gte(col, val) {
        state.filters.push({ column: col, op: "gte", value: val });
        return builder;
      },
      lte(col, val) {
        state.filters.push({ column: col, op: "lte", value: val });
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
          ignoreDuplicates: upsertOpts?.ignoreDuplicates,
        };
        return builder;
      },
      delete() {
        state.pendingOp = { kind: "delete" };
        return builder;
      },
      order(col, orderOpts) {
        state.orderBy = {
          column: col,
          ascending: orderOpts?.ascending !== false,
        };
        return builder;
      },
      limit(n) {
        state.limit = n;
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
        // For `select(..., { count: "exact", head: true })` the caller
        // reads `count` (and ignores `data`); compute it from the
        // filtered match set so head:true probes work in tests.
        let count: number | null = null;
        if (state.countMode === "exact") {
          const rows = store[table] ?? [];
          count = rows.filter((r) => rowMatches(r, state.filters)).length;
        }
        return Promise.resolve(
          resolve({
            data: state.headOnly ? null : data,
            count,
            error: result.error,
          }),
        );
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
