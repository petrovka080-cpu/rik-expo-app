import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  ASPHALT_LEVEL_S2716_CATALOG_ID,
} from "../../src/lib/estimate/v4/asphaltLevelS2716";
import {
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID,
} from "../../src/lib/estimate/v4/slabFoundationLocalRepairS2716";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-17.two-examples-backend-acceptance.v2";
const API_ROOT = process.env.S2716_BACKEND_ORIGIN
  ?? "http://127.0.0.1:8765/canonical-estimate";
const BROKER_URL = process.env.S2716_LOCAL_DEVELOPER_BROKER_URL
  ?? "http://127.0.0.1:54329";
const LOCAL_WEB_ORIGIN = process.env.S2716_LOCAL_WEB_ORIGIN
  ?? "http://localhost:8081";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-17/acceptance/two-examples-backend");
let activeToken = "";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_TWO_EXAMPLES_BACKEND:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function decimalEq(value: unknown, expected: number): boolean {
  return Number(value) === expected;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

async function login(): Promise<string> {
  const response = await fetch(`${BROKER_URL}/session`, {
    method: "POST",
    headers: { Origin: LOCAL_WEB_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ role: "consumer" }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.role === "consumer" && typeof body.access_token === "string",
    `CONSUMER_LOGIN_${response.status}:${JSON.stringify(body).slice(0, 1_000)}`);
  activeToken = body.access_token;
  return activeToken;
}

async function api(token: string, path: string, init: RequestInit = {}): Promise<Json> {
  const request = async (bearer: string) => fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${bearer}`,
      ...(init.body == null ? {} : { "content-type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  let response = await request(activeToken || token);
  if (response.status === 401) {
    await login();
    response = await request(activeToken);
  }
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok,
    `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 3_000)}`);
  return body;
}

async function waitJob(token: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(token, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${jobId}:${String(job.errorCode ?? "")}`);
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`S27_16_TWO_EXAMPLES_BACKEND:JOB_TIMEOUT:${jobId}`);
}

async function compile(
  token: string,
  catalogId: string,
  parameters: Json,
  sourceRequestText: string,
  primaryMeasureParameterId: string,
  runId: string,
): Promise<Json> {
  const accepted = await api(token, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${catalogId}:compile`,
      catalogId,
      parameters,
      sourceRequestText,
      primaryMeasureParameterId,
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function recalculate(
  token: string,
  parent: Json,
  parameters: Json,
  runId: string,
  key: string,
  rowOverrides: Json = parent.amendmentContract?.rowOverrides ?? {},
): Promise<Json> {
  const accepted = await api(token, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:recalculate`,
      catalogId: parent.catalogId,
      parentRevisionId: parent.revisionId,
      sourceRequestText: parent.sourceRequestText,
      primaryMeasureParameterId: parent.primaryMeasureParameterId,
      parameters,
      currencyCode: parent.currencyCode,
      priceSnapshotIds: parent.priceSnapshotIds ?? [],
      rowOverrides,
      customRows: parent.amendmentContract?.customRows ?? [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function allRows(token: string, revisionId: string): Promise<Json[]> {
  const result: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(token, `revisions/${revisionId}/rows?${query}`);
    result.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return result;
}

async function artifact(
  token: string,
  revisionId: string,
  kind: "pdf" | "procurement",
  runId: string,
): Promise<{ metadata: Json; bytes: Buffer }> {
  const request = await api(token, `revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${revisionId}:${kind}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (request.jobId) await waitJob(token, String(request.jobId));
  const query = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  const metadata = await api(token, `revisions/${revisionId}/artifacts/${kind}${query}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `${kind.toUpperCase()}_NOT_READY`);
  const response = await fetch(metadata.signedUrl, {
    headers: { authorization: `Bearer ${activeToken || token}` },
    signal: AbortSignal.timeout(180_000),
  });
  invariant(response.ok, `${kind.toUpperCase()}_DOWNLOAD_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `${kind.toUpperCase()}_SHA_MISMATCH`);
  return { metadata, bytes };
}

async function pdfText(bytes: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" "));
  }
  return pages.join("\n");
}

function rowMap(rows: readonly Json[]): Map<string, Json> {
  return new Map(rows.map((row) => [String(row.rowId), row]));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const searchReleaseId = String(current.searchReleaseId);
  invariant(releaseId === "ffcdae54-0746-526a-aa43-b78e46c06ece"
    && searchReleaseId === "f2ea9ecd-598c-5fea-a894-a573c74d4829",
  `CURRENT_RELEASE_PAIR_RED:${releaseId}:${searchReleaseId}`);
  const token = await login();
  const runtime = await api(token, "runtime-manifest");
  invariant(runtime.compatibilityTuple?.definitionReleaseId === releaseId
    && runtime.compatibilityTuple?.searchReleaseId === searchReleaseId,
  "RUNTIME_RELEASE_PAIR_RED");

  const asphaltPrompt = "Выравнивание асфальтового покрытия 100 м² толщиной 100 мм";
  const asphaltSearch = await api(token,
    `search/catalog?query=${encodeURIComponent(asphaltPrompt)}&pageSize=50&scope=WORKS`);
  const asphaltItems = Array.isArray(asphaltSearch.items) ? asphaltSearch.items as Json[] : [];
  const asphaltIndex = asphaltItems.findIndex((item) =>
    item.catalogId === ASPHALT_LEVEL_S2716_CATALOG_ID);
  invariant(asphaltIndex >= 0 && asphaltIndex < 10
    && asphaltItems[asphaltIndex]?.estimateReady === true,
    `ASPHALT_SEARCH_RED:${asphaltIndex}:${asphaltItems.slice(0, 5).map((item) => item.catalogId).join(",")}`);
  const asphalt = await compile(token, ASPHALT_LEVEL_S2716_CATALOG_ID, {
    area_m2: 100,
    layer_thickness_mm: 100,
  }, asphaltPrompt, "area_m2", runId);
  const asphaltRows = await allRows(token, asphalt.revisionId);
  const asphaltById = rowMap(asphaltRows);
  invariant(asphalt.releaseId === releaseId && asphalt.searchReleaseId === searchReleaseId,
    "ASPHALT_REVISION_IDENTITY_RED");
  invariant(asphaltRows.length === 57 && (asphalt.preliminaryNeeds ?? []).length === 0,
    `ASPHALT_ROW_OR_NEED_RED:${asphaltRows.length}:${asphalt.preliminaryNeeds?.length}`);
  invariant(decimalEq(asphaltById.get("asphalt:control:geometric-compacted-volume")?.quantity, 10)
    && decimalEq(asphaltById.get("asphalt:material:hot-dense-fine-mix")?.quantity, 23.58),
  "ASPHALT_ARITHMETIC_RED");
  invariant(asphaltRows.every((row) => row.unitPrice == null && row.amount == null),
    "ASPHALT_UNKNOWN_PRICE_RED");

  const asphaltEdited = await recalculate(token, asphalt, {
    ...asphalt.parameters,
    layer_thickness_mm: 105,
  }, runId, "asphalt-thickness-edit");
  const asphaltEditedRows = await allRows(token, asphaltEdited.revisionId);
  invariant(asphaltEdited.parentRevisionId === asphalt.revisionId
    && asphaltEditedRows.length === 57
    && decimalEq(rowMap(asphaltEditedRows).get("asphalt:control:geometric-compacted-volume")?.quantity, 10.5)
    && decimalEq(rowMap(asphaltEditedRows).get("asphalt:material:hot-dense-fine-mix")?.quantity, 24.76),
  "ASPHALT_EDIT_LINEAGE_OR_QUANTITY_RED");

  const asphaltPriced = await recalculate(token, asphaltEdited, asphaltEdited.parameters,
    runId, "asphalt-price-edit", {
      ...(asphaltEdited.amendmentContract?.rowOverrides ?? {}),
      "asphalt:material:hot-dense-fine-mix": {
        unitPrice: 5_000,
        provenance: { kind: "manual", reason: "S27.16 acceptance user-entered supplier price" },
      },
    });
  const asphaltPricedRows = await allRows(token, asphaltPriced.revisionId);
  const pricedMix = rowMap(asphaltPricedRows).get("asphalt:material:hot-dense-fine-mix");
  invariant(asphaltPriced.parentRevisionId === asphaltEdited.revisionId
    && asphaltPricedRows.length === 57
    && decimalEq(pricedMix?.unitPrice, 5_000)
    && decimalEq(pricedMix?.amount, 123_800),
  "ASPHALT_PRICE_APPLY_OR_ROW_LOSS_RED");
  const asphaltProcurement = await artifact(token, asphaltPriced.revisionId, "procurement", runId);
  const asphaltProcurementJson = JSON.parse(asphaltProcurement.bytes.toString("utf8")) as Json;
  const asphaltProcurementRows = Array.isArray(asphaltProcurementJson.rows)
    ? asphaltProcurementJson.rows as Json[] : [];
  invariant(asphaltProcurementRows.some((row) =>
    row.rowId === "asphalt:material:hot-dense-fine-mix" && decimalEq(row.quantity, 24.76)),
  "ASPHALT_PROCUREMENT_RED");

  const slabPrompt = "Бетонирование плитного фундамента 150 м² с локальным ремонтом основания";
  const slabSearch = await api(token,
    `search/catalog?query=${encodeURIComponent(slabPrompt)}&pageSize=50&scope=WORKS`);
  const slabItems = Array.isArray(slabSearch.items) ? slabSearch.items as Json[] : [];
  const slabIndex = slabItems.findIndex((item) =>
    item.catalogId === SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID);
  invariant(slabIndex >= 0 && slabIndex < 10
    && slabItems[slabIndex]?.estimateReady === true,
    `SLAB_SEARCH_RED:${slabIndex}:${slabItems.slice(0, 5).map((item) => item.catalogId).join(",")}`);
  const slabShort = await compile(token, SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID, {
    slab_area_m2: 150,
  }, slabPrompt, "slab_area_m2", `${runId}:short`);
  const slabShortNeeds = new Set((slabShort.preliminaryNeeds ?? []).map((need: Json) => need.rowId));
  invariant(slabShortNeeds.has("slab-repair:material:repair-mortar-bags")
    && slabShortNeeds.has("slab-repair:material:mixing-water")
    && slabShortNeeds.has("slab-repair:work:remove-unsound-base"),
  "SLAB_SHORT_REPAIR_COMPOSITION_HIDDEN");

  const slab = await compile(token, SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID, {
    slab_area_m2: 150,
    slab_thickness_mm: 200,
    concrete_mixture_designation: "B25 W6 F150 P4 по проекту",
    local_repair_area_m2: 6,
    local_repair_depth_mm: 20,
  }, slabPrompt, "slab_area_m2", runId);
  const slabRows = await allRows(token, slab.revisionId);
  const slabById = rowMap(slabRows);
  invariant(slab.releaseId === releaseId && slab.searchReleaseId === searchReleaseId,
    "SLAB_REVISION_IDENTITY_RED");
  invariant(slabRows.length === 21 && (slab.preliminaryNeeds ?? []).length === 0,
    `SLAB_ROW_OR_NEED_RED:${slabRows.length}:${slab.preliminaryNeeds?.length}`);
  invariant(decimalEq(slabById.get("slab-repair:material:ready-mix")?.quantity, 31.2)
    && decimalEq(slabById.get("slab-repair:control:repair-mortar-net-mass")?.quantity, 228)
    && decimalEq(slabById.get("slab-repair:material:repair-mortar-bags")?.quantity, 10)
    && decimalEq(slabById.get("slab-repair:control:repair-mortar-dry-remainder")?.quantity, 22)
    && decimalEq(slabById.get("slab-repair:material:mixing-water")?.quantity, 35.568)
    && decimalEq(slabById.get("slab-repair:material:liquid-curing-packages")?.quantity, 2),
  "SLAB_QUANTITY_CHAIN_RED");
  invariant(slabRows.every((row) => row.unitPrice == null && row.amount == null),
    "SLAB_UNKNOWN_PRICE_RED");
  invariant(slabRows.every((row) => !["man_hour", "machine_hour"].includes(String(row.unitId))),
    "SLAB_INVENTED_HOURS_RED");
  invariant(!slabRows.some((row) => /Гидрошпонка\s+(?:100|150)$/u.test(String(row.titleRu))),
    "SLAB_AMBIGUOUS_WATERSTOP_RED");

  const slabPdf = await artifact(token, slab.revisionId, "pdf", runId);
  const slabPdfText = await pdfText(slabPdf.bytes);
  const slabProcurement = await artifact(token, slab.revisionId, "procurement", runId);
  const slabProcurementJson = JSON.parse(slabProcurement.bytes.toString("utf8")) as Json;
  const slabProcurementRows = Array.isArray(slabProcurementJson.rows)
    ? slabProcurementJson.rows as Json[] : [];
  invariant(slabPdf.bytes.subarray(0, 4).toString("ascii") === "%PDF"
    && slabPdf.metadata.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE"
    && slabPdfText.includes("Цены не заполнены")
    && !slabPdfText.includes("Оценено 0,00"),
  "SLAB_PDF_UNKNOWN_PRICE_SEMANTICS_RED");
  invariant(["slab-repair:material:ready-mix", "slab-repair:material:repair-mortar-bags",
    "slab-repair:material:mixing-water", "slab-repair:material:liquid-curing-packages"]
    .every((rowId) => slabProcurementRows.some((row) => row.rowId === rowId)),
  "SLAB_PROCUREMENT_COMPOSITION_RED");

  const slabEdited = await recalculate(token, slab, {
    ...slab.parameters,
    local_repair_area_m2: 7,
  }, runId, "slab-repair-area-edit");
  const slabEditedRows = await allRows(token, slabEdited.revisionId);
  const slabEditedById = rowMap(slabEditedRows);
  invariant(slabEdited.parentRevisionId === slab.revisionId
    && slabEditedRows.length === 21
    && decimalEq(slabEditedById.get("slab-repair:control:repair-mortar-net-mass")?.quantity, 266)
    && decimalEq(slabEditedById.get("slab-repair:material:repair-mortar-bags")?.quantity, 11)
    && decimalEq(slabEditedById.get("slab-repair:control:repair-mortar-dry-remainder")?.quantity, 9)
    && decimalEq(slabEditedById.get("slab-repair:material:mixing-water")?.quantity, 41.496),
  "SLAB_EDIT_LINEAGE_OR_QUANTITY_RED");

  const asphaltHistory = await api(token,
    `revisions?catalogId=${encodeURIComponent(ASPHALT_LEVEL_S2716_CATALOG_ID)}&limit=20`);
  const slabHistory = await api(token,
    `revisions?catalogId=${encodeURIComponent(SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID)}&limit=20`);
  invariant((asphaltHistory.revisions as Json[]).some((revision) =>
    revision.revisionId === asphaltPriced.revisionId)
    && (slabHistory.revisions as Json[]).some((revision) =>
      revision.revisionId === slabEdited.revisionId),
  "REVISION_HISTORY_RED");

  const receiptUnsigned = {
    contract: CONTRACT,
    status: "GREEN_S27_17_TWO_EXAMPLES_BACKEND",
    generatedAt: new Date().toISOString(),
    runId,
    productionAccessed: false,
    definitionReleaseId: releaseId,
    searchReleaseId,
    runtimeIdentity: runtime.compatibilityTuple,
    asphalt: {
      searchIndex: asphaltIndex,
      revisionId: asphalt.revisionId,
      editedRevisionId: asphaltEdited.revisionId,
      pricedRevisionId: asphaltPriced.revisionId,
      rowCount: asphaltRows.length,
      geometricVolumeM3: asphaltById.get("asphalt:control:geometric-compacted-volume")?.quantity,
      procurementMixT: asphaltById.get("asphalt:material:hot-dense-fine-mix")?.quantity,
      editedProcurementMixT: pricedMix?.quantity,
      procurementArtifactSha256: asphaltProcurement.metadata.sha256,
      procurementRowCount: asphaltProcurementRows.length,
    },
    slab: {
      searchIndex: slabIndex,
      shortRevisionId: slabShort.revisionId,
      shortPreliminaryNeedCount: slabShort.preliminaryNeeds?.length ?? 0,
      revisionId: slab.revisionId,
      editedRevisionId: slabEdited.revisionId,
      rowCount: slabRows.length,
      concreteM3: slabById.get("slab-repair:material:ready-mix")?.quantity,
      repairMortarBags: slabById.get("slab-repair:material:repair-mortar-bags")?.quantity,
      liquidCuringPackages: slabById.get("slab-repair:material:liquid-curing-packages")?.quantity,
      pdfSha256: slabPdf.metadata.sha256,
      pdfByteSize: slabPdf.bytes.length,
      pdfPricedRowCount: slabRows.filter((row) => row.unitPrice != null).length,
      pdfUnknownPriceMessageVerified: true,
      procurementArtifactSha256: slabProcurement.metadata.sha256,
      procurementRowCount: slabProcurementRows.length,
    },
    history: {
      asphaltContainsLatest: true,
      slabContainsLatest: true,
    },
  };
  const receipt = {
    ...receiptUnsigned,
    sha256: sha256(JSON.stringify(stable(receiptUnsigned))),
  };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, receipt);
  process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
