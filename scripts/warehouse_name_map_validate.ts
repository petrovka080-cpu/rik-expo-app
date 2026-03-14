import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

type TruthCodeRow = { code: string | null };
type ProjectionRow = {
  code: string | null;
  display_name: string | null;
  source_name: string | null;
  source_priority: number | null;
  updated_at: string | null;
};

function normalizeCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

async function main() {
  const startedAt = Date.now();
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const truthStartedAt = Date.now();
  const truthQ = await supabase
    .from("v_wh_balance_ledger_ui")
    .select("code")
    .not("code", "is", null);
  const truthReadMs = Date.now() - truthStartedAt;
  if (truthQ.error) throw truthQ.error;

  const truthCodes = Array.from(
    new Set(
      ((Array.isArray(truthQ.data) ? truthQ.data : []) as TruthCodeRow[])
        .map((row) => normalizeCode(row.code))
        .filter(Boolean),
    ),
  );

  const projectionStartedAt = Date.now();
  const projectionQ = truthCodes.length
    ? await supabase
        .from("warehouse_name_map_ui")
        .select("code, display_name, source_name, source_priority, updated_at")
        .in("code", truthCodes)
    : { data: [], error: null };
  const projectionReadMs = Date.now() - projectionStartedAt;
  if (projectionQ.error) throw projectionQ.error;

  const projectionRows = (Array.isArray(projectionQ.data) ? projectionQ.data : []) as ProjectionRow[];
  const projectionByCode = new Map<string, ProjectionRow>();
  for (const row of projectionRows) {
    const code = normalizeCode(row.code);
    if (!code || projectionByCode.has(code)) continue;
    projectionByCode.set(code, row);
  }

  const missingCodes = truthCodes.filter((code) => !projectionByCode.has(code));
  const fallbackCodeNameCount = Array.from(projectionByCode.entries()).filter(([code, row]) => {
    const displayName = String(row.display_name ?? "").trim();
    return displayName !== "" && normalizeCode(displayName) === code;
  }).length;
  const blankNameCount = Array.from(projectionByCode.values()).filter((row) => {
    return String(row.display_name ?? "").trim() === "";
  }).length;

  console.log("[warehouse_name_map_validate]");
  console.log(`truthCodeCount=${truthCodes.length}`);
  console.log(`projectionRowCount=${projectionRows.length}`);
  console.log(`projectionHitCount=${truthCodes.length - missingCodes.length}`);
  console.log(`projectionMissCount=${missingCodes.length}`);
  console.log(`fallbackCodeNameCount=${fallbackCodeNameCount}`);
  console.log(`blankNameCount=${blankNameCount}`);
  console.log(`truthReadMs=${truthReadMs}`);
  console.log(`projectionReadMs=${projectionReadMs}`);
  console.log(`totalMs=${Date.now() - startedAt}`);
  console.log(`missingCodes=${JSON.stringify(missingCodes)}`);
}

main().catch((error) => {
  console.error("[warehouse_name_map_validate] failed:", error);
  process.exitCode = 1;
});
