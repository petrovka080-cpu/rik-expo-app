import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const API_ROOT = String(process.env.R45_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8766/canonical-estimate").replace(/\/+$/, "");
const CATALOG_ID = "flooring_interior_laminate_install_large_area";
const OUTPUT = resolve(process.env.R45_LAMINATE_BACKEND_PROOF_OUTPUT
  ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence/13-web/ACTIVE_8081_LAMINATE_BACKEND_PROOF.json");

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer local-r45-proof",
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) throw new Error(`HTTP_${response.status}:${path}:${JSON.stringify(payload)}`);
  return payload ?? {};
}

async function waitForJob(jobId: string) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    const job = await api(`jobs/${encodeURIComponent(jobId)}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R45_LAMINATE_JOB_TIMEOUT:${jobId}`);
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const runtimeManifest = await api("runtime-manifest");
  assert(runtimeManifest.database?.name === "p0_r45_acceptance_full_20260817", "R45_LAMINATE_WRONG_DATABASE");

  const search = await api(`search/catalog?query=${encodeURIComponent("монтаж ламината на большой площади")}&pageSize=100`);
  const selected = search.items?.find((item: Record<string, any>) => item.catalogId === CATALOG_ID);
  assert(selected?.publicationState === "ADMITTED_BACKEND", "R45_LAMINATE_SEARCH_NOT_ADMITTED");
  assert(selected?.selectableMode === "PROFESSIONAL", "R45_LAMINATE_SEARCH_NOT_PROFESSIONAL");

  const catalog = await api(`catalog/${encodeURIComponent(CATALOG_ID)}`);
  const parameters = catalog.item?.parameterSchema;
  assert(Array.isArray(parameters) && parameters.length === 5, "R45_LAMINATE_PARAMETER_COUNT_NOT_5");
  assert(parameters.every((parameter: Record<string, any>) => String(parameter.guide?.guideShortRu ?? "").startsWith("Норма:")),
    "R45_LAMINATE_GUIDE_NOT_INSIDE_INPUT_CONTRACT");
  assert(new Set(parameters.map((parameter: Record<string, any>) => parameter.semanticParameterKey)).size === parameters.length,
    "R45_LAMINATE_DUPLICATE_PARAMETER_SEMANTICS");

  const compile = await api("jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r45-laminate-${randomUUID()}`,
      catalogId: CATALOG_ID,
      parameters: {
        area_m2: "1547",
        laminate_waste_percent: "5",
        underlay_system: "combined_vapour_barrier",
        moisture_barrier_required: true,
        expansion_joint_length_m: "0",
      },
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const job = await waitForJob(String(compile.jobId));
  assert(job.status === "succeeded" && job.resultRevisionId, `R45_LAMINATE_COMPILE_FAILED:${job.errorCode ?? job.status}`);

  const revision = await api(`revisions/${encodeURIComponent(job.resultRevisionId)}`);
  const page = await api(`revisions/${encodeURIComponent(job.resultRevisionId)}/rows?limit=200`);
  const rows = page.rows as Record<string, any>[];
  assert(rows.length === 3, `R45_LAMINATE_BASELINE_ROW_COUNT_NOT_3:${rows.length}`);
  const byId = new Map(rows.map((row) => [row.rowId, row]));
  assert(Number(byId.get("laminate_covering")?.quantity) === 1624.35, "R45_LAMINATE_WASTE_FORMULA_WRONG");
  assert(Number(byId.get("underlay_combined")?.quantity) === 1547, "R45_LAMINATE_UNDERLAY_FORMULA_WRONG");
  assert(Number(byId.get("floating_laminate_installation")?.quantity) === 1547, "R45_LAMINATE_LABOR_FORMULA_WRONG");
  assert(rows.every((row) => row.unitPrice == null && row.amount == null), "R45_LAMINATE_FALSE_PRICE_OR_AMOUNT");
  assert(revision.totals?.unpricedRowCount === 3 && revision.totals?.pricedRowCount === 0,
    "R45_LAMINATE_PRICE_REQUIRED_TOTALS_WRONG");
  assert(String(revision.totals?.amount) === "0", "R45_LAMINATE_FALSE_COMPLETE_TOTAL");
  const semanticOwners = rows.map((row) => row.calculationTrace?.resourceGraph?.semanticOwner).filter(Boolean);
  assert(new Set(semanticOwners).size === semanticOwners.length, "R45_LAMINATE_DUPLICATE_BOQ_SEMANTIC_OWNER");
  assert(rows.every((row) => Array.isArray(row.normativeTrace) && row.normativeTrace.length > 0),
    "R45_LAMINATE_NORMATIVE_TRACE_MISSING");

  const evidence = {
    schemaVersion: "p0-estimate-truth-remediation-r4.5-laminate-backend-proof.v1",
    status: "GREEN_ACTIVE_BACKEND_8766_FOR_USER_RUNTIME_8081",
    startedAt,
    completedAt: new Date().toISOString(),
    apiRoot: API_ROOT,
    runtime: runtimeManifest,
    search: {
      catalogId: selected.catalogId,
      publicationState: selected.publicationState,
      selectableMode: selected.selectableMode,
      searchSnapshotSha256: search.searchIndexSnapshotSha256,
    },
    parameters: parameters.map((parameter: Record<string, any>) => ({
      parameterId: parameter.parameterId,
      semanticParameterKey: parameter.semanticParameterKey,
      guideShortRu: parameter.guide?.guideShortRu,
    })),
    revision: {
      revisionId: revision.revisionId,
      releaseId: revision.releaseId,
      definitionVersion: revision.definitionVersion,
      parameters: revision.parameters,
      totals: revision.totals,
      rows: rows.map((row) => ({
        rowId: row.rowId, titleRu: row.titleRu, unitId: row.unitId, quantity: row.quantity,
        unitPrice: row.unitPrice, amount: row.amount,
        semanticOwner: row.calculationTrace?.resourceGraph?.semanticOwner,
        normativeTraceCount: row.normativeTrace.length,
      })),
    },
    pricePolicy: "PRICE_REQUIRED",
    productionActivationAuthorized: false,
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
