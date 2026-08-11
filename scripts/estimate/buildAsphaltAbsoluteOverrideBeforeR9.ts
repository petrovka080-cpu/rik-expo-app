import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { buildAsphaltRelatedR8Inventory } from "./buildAsphaltRelatedR8Inventory";

const ROOT = path.join(process.cwd(), ".release-runtime", "asphalt-related-r9-r10", "boq-professional-completeness");

type LegacyRow = Record<string, unknown>;

function sha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function csvCell(value: unknown): string {
  const body = value == null ? "" : String(value);
  return /[",\r\n]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body;
}

function findOriginalBefore(): string {
  const candidate = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("before-"))
    .map((entry) => path.join(ROOT, entry.name, "ASPHALT_ALL_WORKS_BEFORE.json"))
    .find(existsSync);
  if (!candidate) throw new Error("ABSOLUTE_BEFORE_SOURCE_NOT_FOUND");
  return candidate;
}

function run(): void {
  const inventory = buildAsphaltRelatedR8Inventory();
  const sourcePath = findOriginalBefore();
  const previous = JSON.parse(readFileSync(sourcePath, "utf8")) as {
    all_r53_catalog_records: LegacyRow[];
    m44_ledger: LegacyRow[];
  };
  const previousByCatalogId = new Map(previous.all_r53_catalog_records.map((row) => [String(row.catalog_id), row]));
  const previousByOwner = new Map(previous.m44_ledger.map((row) => [String(row.canonical_owner), row]));
  const rows = inventory.records
    .filter((record) => record.canonical_technology_id !== null)
    .map((record, index) => {
      const old = previousByCatalogId.get(record.catalog_id)
        ?? previousByOwner.get(record.canonical_technology_id!);
      const scopeRoutedRoad = ["road_construction", "village_road_construction"].includes(record.work_key);
      const legacyRoad = scopeRoutedRoad
        ? calculateExpandedComplexEstimate({
          prompt: "строительство автомобильной дороги 1000 м x 6 м",
          familyId: record.work_key,
        })
        : null;
      const legacyRoadRows = legacyRoad
        ? [
          ...legacyRoad.material_rows,
          ...legacyRoad.work_rows,
          ...legacyRoad.equipment_rows,
          ...legacyRoad.service_rows,
        ]
        : [];
      const totalRows = scopeRoutedRoad
        ? legacyRoadRows.length
        : Number(old?.total_boq_rows ?? 0);
      const materialRows = legacyRoad
        ? legacyRoad.material_rows.length
        : Number(old?.material_rows ?? 0);
      const laborRows = scopeRoutedRoad
        ? legacyRoadRows.filter((row) => row.group === "labor").length
        : Number(old?.labor_rows ?? 0);
      const equipmentRows = legacyRoad
        ? legacyRoad.equipment_rows.length
        : Number(old?.equipment_rows ?? 0);
      const logisticsRows = scopeRoutedRoad
        ? legacyRoadRows.filter((row) => row.group === "logistics").length
        : Number(old?.logistics_rows ?? 0);
      const qaDocs = scopeRoutedRoad
        ? legacyRoadRows.filter((row) => /quality|testing|documentation/.test(row.group)).length
        : Number(old?.qa_documentation_rows ?? 0);
      const redReasons = [
        scopeRoutedRoad ? "PRODUCT_BOQ:RED_SYNTHETIC_STAGE_EXPANSION" : null,
        scopeRoutedRoad ? "PRODUCT_SCOPE:UNREQUESTED_INFRASTRUCTURE" : null,
        totalRows === 0 ? "PRODUCT_BOQ:EMPTY_BOQ" : null,
        "PRODUCT_BOQ:ABSOLUTE_PROFESSIONAL_COMPLETENESS_UNPROVEN",
        "PRODUCT_DURABLE_PERSISTENCE:HISTORY_CREATE_EDIT_REOPEN_COLD_RESTART_UNPROVEN",
        "PRODUCT_APPROVAL:FAIL_CLOSED_GUARD_UNPROVEN",
      ].filter(Boolean).join(";");
      return {
        ordinal: index + 1,
        catalog_id: record.catalog_id,
        work_key: record.work_key,
        name_ru: record.name_ru,
        catalog_group: record.ui_group,
        canonical_owner: record.canonical_technology_id,
        alias_of: record.alias_of ?? "",
        scope: scopeRoutedRoad ? "FULL_PAVEMENT_STRUCTURE_LEGACY_GENERIC" : String(old?.input_scenario ?? "P0_COMPLETE"),
        parameters: scopeRoutedRoad ? "length_m=1000;width_m=6" : "see immutable source case",
        revision_id: String(old?.revision_id ?? ""),
        total_rows: totalRows,
        material_rows: materialRows,
        labor_rows: laborRows,
        equipment_rows: equipmentRows,
        logistics_rows: logisticsRows,
        waste_rows: Number(old?.waste_rows ?? 0),
        qa_documentation_rows: qaDocs,
        valid_quantity_rows: scopeRoutedRoad
          ? legacyRoadRows.filter((row) => Number.isFinite(row.quantity) && row.quantity > 0).length
          : Number(old?.rows_with_valid_quantity ?? 0),
        zero_quantity_rows: scopeRoutedRoad
          ? legacyRoadRows.filter((row) => row.quantity === 0).length
          : Number(old?.zero_quantity_rows ?? 0),
        invalid_quantity_rows: Number(old?.nan_or_infinite_rows ?? 0),
        missing_stages: scopeRoutedRoad ? "typed stage ownership; exact labor; exact quantities" : "absolute professional stage audit not yet proven",
        forbidden_stages: scopeRoutedRoad ? "unrequested curbs|drainage|marking|signs|guardrails" : String(old?.forbidden_stage_owners ?? ""),
        history_saved: false,
        history_reopened: false,
        cold_restart_reopened: false,
        pdf_rows: Number(old?.pdf_row_count ?? totalRows),
        procurement_rows: Number(old?.procurement_row_count ?? 0),
        BOQ_COMPLETENESS: "RED",
        PRICE_COMPLETENESS: "RATES_REQUIRED",
        HISTORY_DURABILITY: "RED",
        PROFESSIONAL_VERDICT: "RED",
        RED_REASON: redReasons,
        evidence: scopeRoutedRoad ? "reproduced legacy expandedComplex road calculator" : String(old?.evidence_path ?? sourcePath),
      };
    });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.join(ROOT, `absolute-override-before-${timestamp}`);
  if (existsSync(output)) throw new Error(`IMMUTABLE_OUTPUT_ALREADY_EXISTS:${output}`);
  mkdirSync(output, { recursive: true });
  const columns = Object.keys(rows[0]);
  const csv = `${columns.join(",")}\n${rows.map((row) => columns.map((key) => csvCell(row[key as keyof typeof row])).join(",")).join("\n")}\n`;
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const body = {
    schema_version: "asphalt-absolute-override-before-r9:v1",
    status: "ASPHALT_DOMAIN_PRODUCT_RED",
    generated_at: new Date().toISOString(),
    immutable_source: sourcePath,
    head,
    inventory: inventory.summary,
    denominator_diff: { previous: { R: 53, M: 44, A: 9, E: 3 }, rescanned: { R: 63, M: 44, A: 19, E: 3 } },
    records: rows,
  };
  const json = `${JSON.stringify(body, null, 2)}\n`;
  const md = `# ASPHALT FULL DOMAIN ABSOLUTE BEFORE\n\n` +
    `Status: \`ASPHALT DOMAIN = PRODUCT RED\`  \n` +
    `Immutable source: \`${sourcePath}\`  \nHEAD: \`${head}\`\n\n` +
    `Re-scan expanded the denominator from R53/M44/A9/E3 to **R63/M44/A19/E3**. ` +
    `The ten added records are the five lifecycle templates each for road_construction and village_road_construction.\n\n` +
    `All ${rows.length}/${rows.length} records are RED under the absolute professional and durable-history contract.\n\n` +
    `| # | catalog_id | canonical owner | rows | BOQ | history | RED reason |\n|---:|---|---|---:|---|---|---|\n` +
    rows.map((row) => `| ${row.ordinal} | ${row.catalog_id} | ${row.canonical_owner} | ${row.total_rows} | RED | RED | ${row.RED_REASON.replace(/\|/g, "\\|")} |`).join("\n") + "\n";
  const files = {
    "ASPHALT_FULL_DOMAIN_BEFORE.csv": csv,
    "ASPHALT_FULL_DOMAIN_BEFORE.json": json,
    "ASPHALT_FULL_DOMAIN_BEFORE.md": md,
  };
  for (const [name, contents] of Object.entries(files)) writeFileSync(path.join(output, name), contents, "utf8");
  const manifest = {
    schema_version: "asphalt-absolute-override-before-r9:v1",
    output,
    head,
    artifacts: Object.entries(files).map(([name, contents]) => ({ name, bytes: Buffer.byteLength(contents), sha256: sha256(contents) })),
    professional_red: rows.length,
    professional_pass: 0,
  };
  writeFileSync(path.join(output, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

run();
