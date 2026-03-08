import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolveForemanContext } from "../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../src/screens/foreman/foreman.locator.adapter";

dotenv.config({ path: "c:/dev/rik-expo-app/.env.local" });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!supabaseUrl || !serviceRole) throw new Error("Missing Supabase env");

const supabase = createClient(supabaseUrl, serviceRole);

type RefOption = { code: string; name: string };
type ReqRow = {
  id: string;
  object_type_code: string | null;
  object_name: string | null;
  object_name_ru: string | null;
  level_code: string | null;
  zone_code: string | null;
};

async function loadRefOptions(table: string, order: string): Promise<RefOption[]> {
  const { data, error } = await supabase.from(table).select("code,name,name_ru").order(order as any);
  if (error) throw error;
  return [{ code: "", name: "— Не выбрано —" }, ...(data || []).map((r: any) => ({ code: String(r.code || ""), name: String(r.name_ru || r.name || r.code || "") }))];
}

async function main() {
  const [lvlOptions, zoneOptions] = await Promise.all([loadRefOptions("ref_levels", "sort"), loadRefOptions("ref_zones", "name")]);

  const selectCandidates = [
    "id,object_type_code,object_name,object_name_ru,level_code,zone_code",
    "id,object_type_code,object_name,level_code,zone_code",
    "id,object_type_code,level_code,zone_code",
  ];

  let data: ReqRow[] = [];
  let lastError: unknown = null;
  for (const select of selectCandidates) {
    const res = await supabase.from("requests").select(select).order("created_at", { ascending: false }).limit(2000);
    if (!res.error) {
      data = ((res.data || []) as unknown[]) as ReqRow[];
      lastError = null;
      break;
    }
    lastError = res.error;
  }
  if (lastError) throw lastError;

  const rows = data || [];
  const invalidLevel: ReqRow[] = [];
  const invalidZone: ReqRow[] = [];
  const byClass: Record<string, { total: number; invalidLevel: number; invalidZone: number }> = {};

  for (const row of rows) {
    const code = String(row.object_type_code || "");
    const name = String(row.object_name_ru || row.object_name || "");
    const ctx = resolveForemanContext(code, name);
    const formUi = adaptFormContext(ctx, lvlOptions, zoneOptions);
    const cls = ctx.config.objectClass;

    byClass[cls] ||= { total: 0, invalidLevel: 0, invalidZone: 0 };
    byClass[cls].total += 1;

    const level = String(row.level_code || "");
    const zone = String(row.zone_code || "");

    if (level && !formUi.locator.isValidValue(level)) {
      invalidLevel.push(row);
      byClass[cls].invalidLevel += 1;
    }
    if (zone && !formUi.zone.isValidValue(zone)) {
      invalidZone.push(row);
      byClass[cls].invalidZone += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: rows.length,
        byClass,
        invalidLevelCount: invalidLevel.length,
        invalidZoneCount: invalidZone.length,
        invalidLevelSample: invalidLevel.slice(0, 20),
        invalidZoneSample: invalidZone.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
