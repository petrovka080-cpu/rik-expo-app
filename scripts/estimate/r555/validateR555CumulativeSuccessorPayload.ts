import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

type Json = Record<string, any>;
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md";
const ROOT = ".release-runtime/r555/cumulative-successor-v1";
const DEFINITIONS = `${ROOT}/R555_CUMULATIVE_DEFINITIONS.jsonl`;
const PRICES = `${ROOT}/R555_CUMULATIVE_PRICE_ITEMS.jsonl`;
const SEARCH = `${ROOT}/R555_CUMULATIVE_SEARCH_DOCUMENTS.jsonl`;
const GROUPS = `${ROOT}/R555_CUMULATIVE_SEARCH_GROUPS.json`;
const MANIFEST = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_SOURCE_MANIFEST.jsonl";
const BUILD_RECEIPT = ".release-runtime/r555/evidence/20A_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_BUILD.json";
const OUTPUT = ".release-runtime/r555/evidence/20B_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_INDEPENDENT_VALIDATION.json";
const GENERIC = [/поставка состава/iu, /работа механизма/iu, /^выполнение работ$/iu, /^прочее$/iu];

function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
async function fileSha(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(resolve(path))) hash.update(chunk);
  return hash.digest("hex");
}
async function* jsonl(path: string): AsyncGenerator<Json> {
  for await (const line of createInterface({ input: createReadStream(resolve(path), { encoding: "utf8" }) })) {
    if (line) yield JSON.parse(line) as Json;
  }
}
function atomicJson(path: string, value: unknown): void {
  const absolute = resolve(path); mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}
function english(value: string): string[] {
  const allowed = new Set(["Ceresit", "CM", "Plus", "PLUS", "CT", "Profi", "Silicate", "Aero", "CN", "Knauf", "Fugenfuller", "Leicht", "CL", "Express", "LS", "DN", "IP", "RJ", "AC", "DC"]);
  return (value.match(/[A-Za-z]{2,}/gu) ?? []).filter((token) => !allowed.has(token));
}

async function main(): Promise<void> {
  const failures: string[] = [];
  if (sha256(readFileSync(resolve(MASTER_PATH))) !== MASTER_SHA256) failures.push("MASTER_SHA_RED");
  const build = JSON.parse(readFileSync(resolve(BUILD_RECEIPT), "utf8")) as Json;
  if (build.status !== "BUILT_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_AWAITING_DATABASE_DRY_RUN") failures.push("BUILD_RECEIPT_RED");
  const buildArtifacts = new Map((build.artifacts as Json[]).map((row) => [String(row.path), row]));
  for (const path of [DEFINITIONS, PRICES, SEARCH, GROUPS]) {
    const expected = buildArtifacts.get(path);
    const actualSha = await fileSha(path);
    if (!expected || expected.sha256 !== actualSha || Number(expected.bytes) !== statSync(resolve(path)).size) failures.push(`ARTIFACT_DRIFT:${path}`);
  }

  const manifestVisible = new Map<string, Json>();
  for await (const row of jsonl(MANIFEST)) if (row.classification === "CANONICAL_VISIBLE") manifestVisible.set(row.canonical_work_id, row);
  const priceKeys = new Set<string>();
  let priceItems = 0;
  for await (const row of jsonl(PRICES)) {
    priceItems += 1;
    const key = `${row.priceGroup}|${row.priceKey}|${row.unitId}`;
    if (priceKeys.has(key)) failures.push(`DUPLICATE_PRICE:${key}`);
    priceKeys.add(key);
    if (row.currencyCode !== "KGS" || !(Number(row.unitPrice) > 0)) failures.push(`PRICE_INVALID:${key}`);
  }

  const definitionIds = new Set<string>();
  const searchExpected = new Map<string, { definitionId: string; titleRu: string; groupId: string }>();
  const counts = { definitions: 0, parameters: 0, formulas: 0, resources: 0, procurement: 0, dynamic: 0, calibrated: 0, fixed: 0, evaluatedZero: 0 };
  let missingPriceBindings = 0;
  let publicEnglish = 0;
  let genericRows = 0;
  let publicEpsilon = 0;
  for await (const definition of jsonl(DEFINITIONS)) {
    counts.definitions += 1;
    const catalogId = String(definition.catalogId);
    if (definitionIds.has(catalogId)) failures.push(`DUPLICATE_DEFINITION:${catalogId}`);
    definitionIds.add(catalogId);
    const manifest = manifestVisible.get(catalogId);
    if (!manifest || manifest.public_title_ru !== definition.titleRu) failures.push(`MANIFEST_DEFINITION_PARITY:${catalogId}`);
    const parameters = definition.parameters as Json[];
    const formulas = definition.formulas as Json[];
    const resources = definition.resources as Json[];
    const parameterIds = new Set(parameters.map((row) => String(row.parameterId)));
    const formulaById = new Map(formulas.map((row) => [String(row.formulaId), row]));
    const baselineNumeric = Object.fromEntries(Object.entries(definition.baseline as Json)
      .filter(([, value]) => typeof value === "number")) as Record<string, number>;
    counts.parameters += parameters.length;
    counts.formulas += formulas.length;
    counts.resources += resources.length;
    if (formulaById.size !== formulas.length || new Set(resources.map((row) => String(row.rowId))).size !== resources.length) failures.push(`ROW_IDENTITY_RED:${catalogId}`);
    for (const formula of formulas) {
      const inputs = formula.inputParameterIds as string[];
      if (inputs.some((id) => !parameterIds.has(id))) failures.push(`FORMULA_UNKNOWN_PARAMETER:${catalogId}:${formula.formulaId}`);
      let quantity: string;
      try { quantity = evaluateFormulaGraph(formula.ast as FormulaAst, baselineNumeric); }
      catch (error) { failures.push(`FORMULA_EVALUATION_RED:${catalogId}:${formula.formulaId}:${String(error)}`); continue; }
      if (Number(quantity) === 0) counts.evaluatedZero += 1;
      if (Number(quantity) === 0.000001) publicEpsilon += 1;
      if (String(formula.fallbackReason ?? "").startsWith("CALIBRATED_FROM_SOURCE_TRACE:")) counts.calibrated += 1;
      else if (String(formula.fallbackReason ?? "").startsWith("FIXED_DESCRIPTIVE_ROW:")) {
        counts.fixed += 1;
        if (!/^[+-]?\d+(?:\.\d+)?$/u.test(String(formula.expressionSource))) failures.push(`FIXED_FORMULA_NOT_LITERAL:${catalogId}:${formula.formulaId}`);
      } else counts.dynamic += 1;
    }
    for (const resource of resources) {
      if (!formulaById.has(String(resource.formulaId))) failures.push(`RESOURCE_FORMULA_MISSING:${catalogId}:${resource.rowId}`);
      if (resource.procurementEligible) counts.procurement += 1;
      if (!priceKeys.has(`${definition.priceGroup}|${resource.costOwnerId}|${resource.unitId}`)) missingPriceBindings += 1;
      publicEnglish += english(String(resource.titleRu)).length + english(String(resource.sourceMetadata?.normativeTrace?.[0]?.normSourceTitle ?? "")).length;
      if (GENERIC.some((pattern) => pattern.test(String(resource.titleRu).trim()))) genericRows += 1;
    }
    searchExpected.set(catalogId, { definitionId: String(definition.definitionId), titleRu: String(definition.titleRu), groupId: String(definition.groupId) });
  }

  const groupRows = JSON.parse(readFileSync(resolve(GROUPS), "utf8")) as Json[];
  const groupIds = new Set(groupRows.map((row) => String(row.groupId)));
  const searchIds = new Set<string>();
  let searchDocuments = 0;
  for await (const document of jsonl(SEARCH)) {
    searchDocuments += 1;
    const catalogId = String(document.canonical_work_id);
    const expected = searchExpected.get(catalogId);
    if (searchIds.has(catalogId)) failures.push(`DUPLICATE_SEARCH:${catalogId}`);
    searchIds.add(catalogId);
    if (!expected || expected.definitionId !== document.definition_id || expected.titleRu !== document.public_title_ru || expected.groupId !== document.group_id) failures.push(`SEARCH_DEFINITION_PARITY:${catalogId}`);
    if (!groupIds.has(String(document.group_id))) failures.push(`SEARCH_GROUP_MISSING:${catalogId}`);
    publicEnglish += english(String(document.public_title_ru)).length + (document.public_aliases as string[]).flatMap(english).length;
  }
  const expectedCounts = build.totals as Json;
  if (counts.definitions !== 10_322 || definitionIds.size !== 10_322 || manifestVisible.size !== 10_322) failures.push("DEFINITION_DENOMINATOR_RED");
  if (counts.formulas !== 615_452 || counts.resources !== 615_452 || counts.formulas !== counts.resources) failures.push("FORMULA_RESOURCE_DENOMINATOR_RED");
  if (counts.parameters !== Number(expectedCounts.parameters) || counts.procurement !== 261_448) failures.push("PARAMETER_PROCUREMENT_DENOMINATOR_RED");
  if (counts.dynamic + counts.calibrated + counts.fixed !== counts.formulas) failures.push("FORMULA_CLASSIFICATION_EQUATION_RED");
  if (searchDocuments !== 10_322 || searchIds.size !== 10_322) failures.push("SEARCH_DENOMINATOR_RED");
  if (priceItems !== 25_091 || missingPriceBindings !== 0) failures.push(`PRICE_BINDING_RED:${priceItems}:${missingPriceBindings}`);
  if (groupRows.length !== 2_368 || groupIds.size !== 2_368) failures.push("GROUP_DENOMINATOR_RED");
  if (publicEnglish !== 0 || genericRows !== 0 || publicEpsilon !== 0) failures.push(`PUBLIC_CONTENT_RED:${publicEnglish}:${genericRows}:${publicEpsilon}`);
  const receipt = {
    schema_version: "rik-expo-app-r555.cumulative-successor-payload-independent-validation.v1",
    generated_utc: new Date().toISOString(), master_sha256: MASTER_SHA256,
    status: failures.length === 0 ? "GREEN_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_INDEPENDENTLY_VALIDATED" : "RED_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_VALIDATION",
    counts: { ...counts, searchDocuments, searchGroups: groupRows.length, priceItems, missingPriceBindings, publicEnglish, genericRows, publicEpsilon },
    failures: failures.slice(0, 500), failure_count: failures.length,
    database_changed: false, production_accessed: false,
  };
  atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(JSON.stringify(receipt)) });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  if (failures.length) process.exitCode = 1;
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
