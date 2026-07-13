import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260323023959_backfill_director_finance_fetch_summary_v1.sql";
const oldScopeName = "20260323024000_director_finance_panel_scope_rpc_v1.sql";
const restoreCheckBodiesName = "20260605085959_restore_check_function_bodies_after_legacy_replay.sql";
const ontologyName = "20260605090000_add_construction_work_ontology.sql";
const contractorPdfSourceName = "20260324143000_pdf_contractor_work_source_v1.sql";
const warehouseIssueQueueHardeningName =
  "20260327110000_warehouse_issue_queue_scope_v4_contract_hardening.sql";
const warehouseIncomingQueueName = "20260327113000_warehouse_incoming_queue_scope_v1.sql";

it("keeps the ontology migration after the legacy replay repair and additive-only", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(oldScopeName));
  expect(migrationNames.indexOf(oldScopeName)).toBeLessThan(migrationNames.indexOf(ontologyName));
  expect(migrationNames.indexOf(restoreCheckBodiesName)).toBeLessThan(migrationNames.indexOf(ontologyName));

  const ontologySql = fs.readFileSync(path.join(migrationsDir, ontologyName), "utf8");
  const contractorPdfSourceSql = fs.readFileSync(path.join(migrationsDir, contractorPdfSourceName), "utf8");
  const warehouseIssueQueueHardeningSql = fs.readFileSync(
    path.join(migrationsDir, warehouseIssueQueueHardeningName),
    "utf8",
  );
  const warehouseIncomingQueueSql = fs.readFileSync(path.join(migrationsDir, warehouseIncomingQueueName), "utf8");
  const lower = ontologySql.toLowerCase();

  expect(contractorPdfSourceSql).toContain("set check_function_bodies = off;");
  expect(warehouseIssueQueueHardeningSql).toContain("set check_function_bodies = off;");
  expect(warehouseIncomingQueueSql).toContain("set check_function_bodies = off;");

  for (const table of [
    "construction_work_domains",
    "construction_work_definitions",
    "construction_work_aliases",
    "construction_work_classification_codes",
    "construction_work_catalog_links",
    "construction_work_recipe_rows",
    "construction_work_migration_audit",
  ]) {
    expect(lower).toContain(`create table if not exists public.${table}`);
  }

  expect(lower).not.toContain("director_finance_fetch_summary_v1");
  expect(lower).not.toContain("director_finance_panel_scope_v1");
  expect(lower).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(lower).not.toMatch(/\btruncate\b/);
  expect(lower).not.toMatch(/\bdelete\s+from\s+public\.catalog_items\b/);
  expect(lower).not.toMatch(/\binsert\s+into\s+public\.catalog_items\b/);
  expect(lower).not.toMatch(/\bupdate\s+public\.catalog_items\b/);
  expect(lower).not.toMatch(/\balter\s+table\s+public\.catalog_items\b/);
});
