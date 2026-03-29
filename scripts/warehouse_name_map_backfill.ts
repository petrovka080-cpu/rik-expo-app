import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const [{ getServerSupabaseClient }, { refreshWarehouseNameMapUiProjection }] = await Promise.all([
    import("../src/lib/server/serverSupabaseClient"),
    import("../src/screens/warehouse/warehouse.nameMap.ui"),
  ]);

  const updated = await refreshWarehouseNameMapUiProjection(getServerSupabaseClient(), {
    refreshMode: "full",
  });
  console.log("[warehouse_name_map_backfill] refreshed rows:", updated);
}

main().catch((error) => {
  console.error("[warehouse_name_map_backfill] failed:", error);
  process.exitCode = 1;
});
