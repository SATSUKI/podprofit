/**
 * COO triage helper: print all `status='new'` rows from the `inquiries`
 * table so the founder can answer "問い合わせきてる?" in one command.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-inquiries.ts
 *
 * Optional flags:
 *   --status=<status>    Default: "new". Pass "all" to disable the filter.
 *   --limit=<n>          Default: 50. Hard cap at 500.
 *   --json               Emit machine-readable JSON instead of the
 *                        default human-readable summary.
 *
 * Environment variables (required):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Output (default human-readable):
 *   3 new inquiries (showing 3)
 *   ─────────────────────────────────────────────────────────────────────
 *   [2026-05-15 09:14] bug · alice@example.com (Alice)
 *     id: a1b2c3d4-...
 *     subject: Etsy fee miscalc when ads on
 *     message: Hey, when I tick "include offsite ads" the calculator
 *              still uses 6.5% for the transaction fee, but Etsy is now…
 *
 * Exit codes:
 *   0  success (any number of inquiries)
 *   1  configuration error (missing env)
 *   2  database error
 */

import { createClient } from "@supabase/supabase-js";

interface CliOptions {
  status: string; // "new" | "in_progress" | "replied" | "archived" | "spam" | "all"
  limit: number;
  json: boolean;
}

interface InquiryRow {
  id: string;
  name: string | null;
  email: string;
  category: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

const VALID_STATUSES = new Set([
  "all",
  "new",
  "in_progress",
  "replied",
  "archived",
  "spam",
]);

function parseArgs(argv: readonly string[]): CliOptions {
  let status = "new";
  let limit = 50;
  let json = false;
  for (const arg of argv) {
    if (arg.startsWith("--status=")) {
      const v = arg.slice("--status=".length);
      if (!VALID_STATUSES.has(v)) {
        throw new Error(
          `Invalid --status="${v}". Use one of: ${[...VALID_STATUSES].join(", ")}.`,
        );
      }
      status = v;
    } else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`Invalid --limit="${arg.slice("--limit=".length)}".`);
      }
      limit = Math.min(n, 500);
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsageAndExit(0);
    }
  }
  return { status, limit, json };
}

function printUsageAndExit(code: number): never {
  process.stdout.write(
    [
      "Usage: tsx scripts/check-inquiries.ts [--status=<status>] [--limit=<n>] [--json]",
      "",
      "  --status   one of: all | new | in_progress | replied | archived | spam (default: new)",
      "  --limit    max rows to fetch, capped at 500 (default: 50)",
      "  --json     emit JSON instead of human-readable text",
      "",
      "Environment: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY must be set.",
      "",
    ].join("\n"),
  );
  process.exit(code);
}

function truncatePreview(s: string, max: number): string {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function formatHuman(rows: InquiryRow[], opts: CliOptions): string {
  const lines: string[] = [];
  const header =
    opts.status === "all"
      ? `${rows.length} inquiries (any status)`
      : `${rows.length} inquiries with status="${opts.status}"`;
  lines.push(header);
  lines.push("─".repeat(72));
  if (rows.length === 0) {
    lines.push("(no inquiries match)");
    return lines.join("\n");
  }
  for (const r of rows) {
    const ts = r.created_at.replace("T", " ").slice(0, 19);
    const who = r.name ? `${r.email} (${r.name})` : r.email;
    lines.push(`[${ts}] ${r.category} · ${who}`);
    lines.push(`  id: ${r.id}`);
    if (r.subject) lines.push(`  subject: ${r.subject}`);
    lines.push(`  message: ${truncatePreview(r.message, 240)}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    process.stderr.write(
      "[error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("inquiries")
    .select("id, name, email, category, subject, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit);
  if (opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) {
    process.stderr.write(`[error] Supabase query failed: ${error.message}\n`);
    process.exit(2);
  }

  const rows = (data ?? []) as InquiryRow[];
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatHuman(rows, opts)}\n`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[fatal] ${msg}\n`);
  process.exit(2);
});
