import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SOURCE = resolve(ROOT, ".release-runtime/r553/evidence/11_R553_CONSUMER_ESTIMATE_CREATE_GATE_A.json");
const OUTPUT = resolve(ROOT, ".release-runtime/r555/evidence/06_R555_REGRESSION_CONTENT_RED.json");
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";

type BackendEvent = {
  url?: string;
  response_body?: {
    rows?: BoqRow[];
    rowCount?: number;
    totals?: unknown;
  };
};

type BoqRow = {
  category: string;
  titleRu: string;
  quantity: string;
  unitPrice: string | null;
  amount: string | null;
};

type GateCase = {
  id: string;
  catalog_id: string;
  revision_id: string;
  status: string;
  backend: BackendEvent[];
};

type GateReceipt = {
  status: string;
  green: number;
  denominator: number;
  cases: GateCase[];
};

const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
};

const sourceBytes = readFileSync(SOURCE);
const source = JSON.parse(sourceBytes.toString("utf8")) as GateReceipt;
if (source.status !== "GREEN_R553_CONSUMER_ESTIMATE_CREATE_GATE_A_2_OF_2" || source.green !== 2 || source.denominator !== 2) {
  throw new Error("R555_FUNCTIONAL_PREDECESSOR_NOT_GREEN_2_OF_2");
}

const cases = source.cases.map((item) => {
  const rows = item.backend.flatMap((event) => event.response_body?.rows ?? []);
  const revision = item.backend.find((event) => /\/revisions\/[^/]+$/u.test(event.url ?? "") && event.response_body?.rowCount !== undefined)?.response_body;
  const count = (predicate: (row: BoqRow) => boolean): number => rows.filter(predicate).length;
  const categories = Object.fromEntries(
    [...new Set(rows.map((row) => row.category))].sort().map((category) => [category, count((row) => row.category === category)]),
  );
  return {
    id: item.id,
    catalog_id: item.catalog_id,
    revision_id: item.revision_id,
    functional_status: item.status,
    content_status: "RED",
    row_count: rows.length,
    categories,
    generic_supply_titles: count((row) => /^поставка (?:состава|системы) для/iu.test(row.titleRu)),
    generic_machine_titles: count((row) => /^работа (?:механизма|домкратов|.*оборудования)/iu.test(row.titleRu)),
    generic_execute_titles: count((row) => /^выполнение/iu.test(row.titleRu)),
    titles_with_raw_english: count((row) => /[A-Za-z]{2,}/u.test(row.titleRu)),
    public_epsilon_rows: count((row) => Number(row.quantity) > 0 && Number(row.quantity) <= 0.000_001),
    public_zero_rows: count((row) => Number(row.quantity) === 0),
    missing_unit_price_rows: count((row) => row.unitPrice === null),
    missing_amount_rows: count((row) => row.amount === null),
    totals: revision?.totals ?? null,
  };
});

if (cases.length !== 2 || cases.some((item) => item.row_count !== 350 || item.content_status !== "RED")) {
  throw new Error("R555_REGRESSION_CONTENT_RED_NOT_REPRODUCED_EXACTLY");
}

const receipt: Record<string, unknown> = {
  schema_version: "rik-expo-app-r555.regression-content-red.v1",
  generated_utc: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  status: "SEALED_FUNCTIONAL_GREEN_2_OF_2_CONTENT_RED_2_OF_2",
  functional_green: 2,
  functional_denominator: 2,
  content_red: 2,
  content_denominator: 2,
  source_receipt: {
    path: SOURCE.replaceAll("\\", "/"),
    bytes: sourceBytes.length,
    sha256: sha256(sourceBytes),
  },
  authoritative_root_owner: "scripts/estimate/concreteBackendR5/concreteR5Model.ts",
  root_cause: {
    component_pool: "UNRELATED_DOMAIN_OWNER_POOL_ROTATED_INTO_EACH_SELECTED_WORK",
    artificial_floor: "FLOOR_BY_COMPLEXITY_FORCES_350_ROWS_FOR_L3",
    activity_generator: "GENERIC_ACTIVITY_PREFIXES_EXPANDED_PER_UNRELATED_COMPONENT",
    epsilon_leak: "0.000001_ACCEPTED_AS_PUBLIC_MINIMUM_AND_BASELINE",
  },
  cases,
  production_accessed: false,
  deployed: false,
  merged: false,
  released: false,
  ota: false,
};
receipt.payload_sha256 = sha256(stable(receipt));
mkdirSync(dirname(OUTPUT), { recursive: true });
const temporary = `${OUTPUT}.${process.pid}.tmp`;
writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
renameSync(temporary, OUTPUT);
process.stdout.write(`${JSON.stringify({ output: OUTPUT.replaceAll("\\", "/"), status: receipt.status, payload_sha256: receipt.payload_sha256 })}\n`);
