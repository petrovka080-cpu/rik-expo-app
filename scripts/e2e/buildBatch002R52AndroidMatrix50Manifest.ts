import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { isCanonicalEstimateUserEditableParameter } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";

type Json = Record<string, any>;

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (3).md");
const MASTER_SHA256 = "e392dbca6bb2bbac9d1ba1a67ebf55e07bd5c6f813700a28f20035a4542f1ce7";
const BACKEND = resolve(".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R4.json");
const WEB = resolve(".release-runtime/real-professional-estimates-r4/evidence/05-web/batch002/BATCH002_WEB_80_RESULT.json");
const OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002/BATCH002_R52_ANDROID_API34_MATRIX_50_MANIFEST.json");
const API_ROOT = String(process.env.BATCH002_R52_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8767/canonical-estimate").replace(/\/+$/u, "");

const SCENARIOS = [
  "work_search_exact_selection",
  "parent_revision_open",
  "parameter_and_normative_guide",
  "parameter_edit_recalculate_child",
  "quantity_edit",
  "unit_price_edit_child",
  "specification_edit",
  "material_search_add",
  "material_replace",
  "photo_add_and_view",
  "note_add",
  "optional_position",
  "history_and_diff",
  "historical_revision_restore_as_new",
  "professional_pdf",
  "procurement",
  "cold_reopen_exact_revision",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

async function api(path: string): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: "Bearer local-dev-runtime-token" },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`BATCH002_R52_ANDROID_MANIFEST_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body ?? {};
}

async function mapConcurrent<T, U>(values: readonly T[], concurrency: number,
  operation: (value: T, index: number) => Promise<U>): Promise<U[]> {
  const results = new Array<U>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index]!, index);
    }
  }));
  return results;
}

function changedNumericValue(parameter: Json, current: number): number {
  const integer = parameter.valueType === "integer";
  const minimum = Number(parameter.constraints?.min);
  const maximum = Number(parameter.constraints?.max);
  const configuredStep = Number(parameter.guide?.step);
  const step = integer ? 1 : Math.max(0.5, Number.isFinite(configuredStep) ? configuredStep : 0.5);
  const increased = integer ? Math.ceil(current + step) : Math.round((current + step) * 1_000) / 1_000;
  if (!Number.isFinite(maximum) || increased <= maximum) return increased;
  const decreased = integer ? Math.floor(current - step) : Math.round((current - step) * 1_000) / 1_000;
  invariant(!Number.isFinite(minimum) || decreased >= minimum,
    `BATCH002_R52_ANDROID_PARAMETER_NO_ALTERNATE:${parameter.parameterId}`);
  return decreased;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER)) === MASTER_SHA256, "BATCH002_R52_ANDROID_MASTER_SHA_MISMATCH");
  const backend = JSON.parse(readFileSync(BACKEND, "utf8")) as Json;
  const web = JSON.parse(readFileSync(WEB, "utf8")) as Json;
  invariant(backend.status === "GREEN_R4_BATCH002_ISOLATED_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
    && backend.proofs?.length === 55, "BATCH002_R52_ANDROID_BACKEND_INPUT_RED");
  invariant(web.status === "GREEN_REAL_WEB_80_OF_80_NO_RELEASE" && web.green === 80
    && web.executed === 80 && web.blockers?.length === 0, "BATCH002_R52_ANDROID_WEB_INPUT_RED");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(web.source?.head === head && web.source?.tree === tree, "BATCH002_R52_ANDROID_WEB_SOURCE_DRIFT");

  const selected = (backend.proofs as Json[]).slice(0, 50);
  invariant(selected.length === 50 && new Set(selected.map((row) => row.catalogId)).size === 50,
    "BATCH002_R52_ANDROID_SELECTION_DENOMINATOR_RED");
  const cases = await mapConcurrent(selected, 6, async (proof, index) => {
    const catalogId = String(proof.catalogId);
    const parentRevisionId = String(proof.finalRevisionId);
    const [catalogResponse, revision, rowsResponse] = await Promise.all([
      api(`catalog/${encodeURIComponent(catalogId)}`),
      api(`revisions/${parentRevisionId}`),
      api(`revisions/${parentRevisionId}/rows?limit=200`),
    ]);
    const catalog = (catalogResponse.item ?? catalogResponse) as Json;
    const parameters = (catalog.parameterSchema as Json[]).filter(isCanonicalEstimateUserEditableParameter);
    const parameter = parameters.find((candidate) =>
      ["decimal", "integer"].includes(String(candidate.valueType))
      && Number.isFinite(Number(revision.parameters?.[candidate.parameterId]))
      && Array.isArray(candidate.formulaConsumers)
      && candidate.formulaConsumers.length > 0);
    invariant(parameter, `BATCH002_R52_ANDROID_NUMERIC_PARAMETER_MISSING:${catalogId}`);
    const baselineValue = Number(revision.parameters[parameter.parameterId]);
    const changedValue = changedNumericValue(parameter, baselineValue);
    const rows = rowsResponse.rows as Json[];
    const material = rows.find((row) => row.category === "material");
    invariant(rows.length > 0 && material, `BATCH002_R52_ANDROID_ROWS_RED:${catalogId}`);
    return {
      case: index + 1,
      catalogId,
      titleRu: catalog.titleRu,
      parentRevisionId,
      releaseId: String(revision.releaseId),
      expectedRowCount: rows.length,
      parameter: {
        parameterId: String(parameter.parameterId),
        ordinal: Number(parameter.ordinal),
        titleRu: String(parameter.titleRu),
        unitId: String(parameter.unitId),
        guideShortRu: String(parameter.guide?.guideShortRu ?? ""),
        baselineValue,
        changedValue,
      },
      materialRow: {
        rowId: String(material.rowId),
        titleRu: String(material.titleRu),
        quantity: Number(material.quantity),
        unitPrice: material.unitPrice == null ? null : Number(material.unitPrice),
      },
      primaryScenario: SCENARIOS[index % SCENARIOS.length],
      coverage: index < SCENARIOS.length ? [SCENARIOS[index]] : ["exact_revision_open", "row_and_parameter_parity"],
    };
  });
  invariant(cases.every((row) => row.releaseId === backend.releaseId), "BATCH002_R52_ANDROID_RELEASE_DRIFT");
  invariant(SCENARIOS.every((scenario) => cases.some((row) => row.coverage.includes(scenario))),
    "BATCH002_R52_ANDROID_REQUIRED_COVERAGE_MISSING");
  const manifest = {
    schemaVersion: "real-professional-estimates-r5.2.batch002-android-api34-matrix50-manifest.v1",
    generatedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source: {
      branch: git("branch", "--show-current"),
      head,
      tree,
      workingTreeDiffSha256: sha256(git("diff", "--binary", "HEAD")),
    },
    webInput: { path: WEB, sha256: sha256(readFileSync(WEB)), status: web.status },
    backendInput: { path: BACKEND, sha256: sha256(readFileSync(BACKEND)), status: backend.status },
    releaseId: backend.releaseId,
    searchReleaseId: backend.searchReleaseId,
    expected: 50,
    distinctCatalogIds: new Set(cases.map((row) => row.catalogId)).size,
    androidApiLevel: 34,
    sampleFrozenBeforeExecution: true,
    requiredCoverage: SCENARIOS,
    cases,
    status: "GREEN_R52_BATCH002_ANDROID_MATRIX_50_MANIFEST_FROZEN_NO_RELEASE",
  };
  atomicJson(OUTPUT, manifest);
  process.stdout.write(`${JSON.stringify({ status: manifest.status, output: OUTPUT, expected: manifest.expected,
    distinctCatalogIds: manifest.distinctCatalogIds, sha256: sha256(readFileSync(OUTPUT)) }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
