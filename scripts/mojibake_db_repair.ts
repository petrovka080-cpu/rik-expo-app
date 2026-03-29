import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import { createVerifierAdmin } from "./_shared/testUserDiscipline";
import { normalizeRuText } from "../src/lib/text/encoding";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

type RepairSpec = {
  table: string;
  idColumn: string;
  columns: string[];
};

type RowRecord = Record<string, unknown>;

type UntypedAdmin = {
  from: (relation: string) => {
    select: (columns: string) => {
      range: (
        from: number,
        to: number,
      ) => Promise<{ data: RowRecord[] | null; error: Error | null }>;
    };
    update: (patch: RowRecord) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
  };
};

const admin = createVerifierAdmin("mojibake-db-repair");
const adminUntyped = admin as unknown as UntypedAdmin;

const REPAIR_SPECS: RepairSpec[] = [
  {
    table: "subcontracts",
    idColumn: "id",
    columns: ["object_name", "work_type", "work_zone", "uom", "contractor_org", "contractor_rep"],
  },
  {
    table: "requests",
    idColumn: "id",
    columns: ["name", "object_name"],
  },
  {
    table: "request_items",
    idColumn: "id",
    columns: ["name_human", "uom"],
  },
  {
    table: "warehouse_issues",
    idColumn: "id",
    columns: ["status", "object_name", "work_name"],
  },
];

const PAGE_SIZE = 500;
const MOJIBAKE_MARKERS =
  /(?:Р[\u0400-\u04FF](?:Р|С)|С[\u0400-\u04FF](?:Р|С)|Р[–ЉЊЎЂѓ]|С[ЏЎЂѓ]|вЂ|Гђ|Г‘|Гѓ|Г‚|пїЅ)/u;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

function normalizeField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || !MOJIBAKE_MARKERS.test(raw)) return null;
  const normalized = String(normalizeRuText(raw) ?? "").trim();
  if (!normalized || normalized === raw || MOJIBAKE_MARKERS.test(normalized)) return null;
  return normalized;
}

async function repairTable(spec: RepairSpec) {
  let offset = 0;
  let scannedRows = 0;
  let repairedRows = 0;
  let repairedFields = 0;
  const samples: Array<{ id: string; patch: RowRecord }> = [];

  while (true) {
    const { data, error } = await adminUntyped
      .from(spec.table)
      .select([spec.idColumn, ...spec.columns].join(","))
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) break;
    scannedRows += rows.length;

    for (const row of rows) {
      const id = String(row[spec.idColumn] ?? "").trim();
      if (!id) continue;

      const patch: RowRecord = {};
      for (const column of spec.columns) {
        const normalized = normalizeField(row[column]);
        if (normalized != null) patch[column] = normalized;
      }

      const patchKeys = Object.keys(patch);
      if (!patchKeys.length) continue;

      const { error: updateError } = await adminUntyped
        .from(spec.table)
        .update(patch)
        .eq(spec.idColumn, id);
      if (updateError) throw updateError;

      repairedRows += 1;
      repairedFields += patchKeys.length;
      if (samples.length < 20) samples.push({ id, patch });
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return {
    table: spec.table,
    scannedRows,
    repairedRows,
    repairedFields,
    samples,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const tableResults = [];
  for (const spec of REPAIR_SPECS) {
    tableResults.push(await repairTable(spec));
  }

  const summary = {
    startedAt,
    completedAt: new Date().toISOString(),
    tables: tableResults,
    repairedRowsTotal: tableResults.reduce((sum, entry) => sum + entry.repairedRows, 0),
    repairedFieldsTotal: tableResults.reduce((sum, entry) => sum + entry.repairedFields, 0),
  };

  writeJson("artifacts/mojibake-db-repair-summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
