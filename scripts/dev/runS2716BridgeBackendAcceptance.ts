import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { BRIDGE_ASPHALT_COMPLETE_CATALOG_ID } from "../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-19.bridge-100-and-4800m2-backend-acceptance.v2";
const API_ROOT = process.env.S2716_BACKEND_ORIGIN
  ?? "http://127.0.0.1:8765/canonical-estimate";
const BROKER_URL = process.env.S2716_LOCAL_DEVELOPER_BROKER_URL
  ?? "http://127.0.0.1:54329";
const LOCAL_WEB_ORIGIN = process.env.S2716_LOCAL_WEB_ORIGIN
  ?? "http://localhost:8081";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-19/acceptance/bridge-100m2-backend");
let activeToken = "";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_BRIDGE_BACKEND:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function decimalEq(value: unknown, expected: number): boolean {
  return Math.abs(Number(value) - expected) < 0.000001;
}

async function login(): Promise<string> {
  const suppliedToken = String(process.env.S2716_BACKEND_ACCESS_TOKEN ?? "")
    .trim()
    .replace(/^Bearer\s+/iu, "");
  if (suppliedToken) {
    invariant(suppliedToken.length > 20, "SUPPLIED_ACCESS_TOKEN_RED");
    activeToken = suppliedToken;
    return activeToken;
  }
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
  invariant(response.ok, `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 3_000)}`);
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
  throw new Error(`S27_16_BRIDGE_BACKEND:JOB_TIMEOUT:${jobId}`);
}

async function compile(
  token: string,
  parameters: Json,
  sourceRequestText: string,
  runId: string,
  key = "100m2",
): Promise<Json> {
  const accepted = await api(token, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:compile`,
      catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
      parameters,
      sourceRequestText,
      primaryMeasureParameterId: "area_m2",
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
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

function byId(rows: readonly Json[]): Map<string, Json> {
  return new Map(rows.map((row) => [String(row.rowId), row]));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const searchReleaseId = String(current.searchReleaseId);
  invariant(releaseId === "890b3fff-6372-57e8-8c36-1e09672489a0"
    && searchReleaseId === "8cb0714d-3c6d-5ea5-9fd5-2a45971d7f99",
  `CURRENT_RELEASE_PAIR_RED:${releaseId}:${searchReleaseId}`);

  const token = await login();
  const runtime = await api(token, "runtime-manifest");
  invariant(runtime.compatibilityTuple?.definitionReleaseId === releaseId
    && runtime.compatibilityTuple?.searchReleaseId === searchReleaseId,
  "RUNTIME_RELEASE_PAIR_RED");

  const prompt = "Устройство полной системы асфальтобетонного покрытия моста 20 м длиной и 5 м шириной, площадь 100 м²";
  const search = await api(token,
    `search/catalog?query=${encodeURIComponent(prompt)}&pageSize=50&scope=WORKS`);
  const items = Array.isArray(search.items) ? search.items as Json[] : [];
  const searchIndex = items.findIndex((item) => item.catalogId === BRIDGE_ASPHALT_COMPLETE_CATALOG_ID);
  invariant(searchIndex >= 0 && searchIndex < 10 && items[searchIndex]?.estimateReady === true,
    `SEARCH_RED:${searchIndex}:${items.slice(0, 10).map((item) => item.catalogId).join(",")}`);

  const original = await compile(token, {
    bridge_length_m: 20,
    bridge_width_m: 5,
    area_m2: 100,
  }, prompt, runId);
  const originalRows = await allRows(token, original.revisionId);
  const originalById = byId(originalRows);
  invariant(original.releaseId === releaseId && original.searchReleaseId === searchReleaseId,
    "REVISION_IDENTITY_RED");
  invariant(originalRows.length === 194 && (original.preliminaryNeeds ?? []).length === 0,
    `ROW_OR_NEED_RED:${originalRows.length}:${original.preliminaryNeeds?.length}`);
  invariant(originalRows.every((row) => Number(row.quantity) > 0
    || row.rowId === "bridge:leveling:applicability"), "NONPOSITIVE_QUANTITY_RED");
  invariant(originalRows.every((row) => row.unitPrice == null && row.amount == null),
    "UNKNOWN_PRICE_STATE_RED");
  invariant(decimalEq(originalById.get("bridge:binder:asphalt:material:hot-dense-fine-mix")?.quantity, 12.08)
    && decimalEq(originalById.get("bridge:wearing:asphalt:material:hot-dense-fine-mix")?.quantity, 12.08)
    && decimalEq(originalById.get("bridge:screed:material:ready-mix")?.quantity, 4.32)
    && decimalEq(originalById.get("bridge:screed:work:finish-surface")?.quantity, 100)
    && decimalEq(originalById.get("bridge:screed:work:install-curing")?.quantity, 100)
    && decimalEq(originalById.get("bridge:screed:work:maintain-curing")?.quantity, 100)
    && decimalEq(originalById.get("bridge:screed:work:remove-curing")?.quantity, 100)
    && decimalEq(originalById.get("bridge:screed:material:curing-sheet")?.quantity, 110)
    && decimalEq(originalById.get("bridge:screed:reinforcement-mesh")?.quantity, 444)
    && decimalEq(originalById.get("bridge:screed:reinforcement-mesh-cards")?.quantity, 22)
    && decimalEq(originalById.get("bridge:screed:reinforcement-mesh-purchased-area")?.quantity, 132)
    && decimalEq(originalById.get("bridge:screed:mesh-cover-compatibility")?.quantity, 3)
    && decimalEq(originalById.get("bridge:screed:spacers")?.quantity, 400)
    && decimalEq(originalById.get("bridge:screed:spacer-packages")?.quantity, 1)
    && decimalEq(originalById.get("bridge:screed:formwork-screw-boxes")?.quantity, 2)
    && decimalEq(originalById.get("bridge:screed:formwork-stakes")?.quantity, 50)
    && decimalEq(originalById.get("bridge:screed:formwork-braces")?.quantity, 34)
    && decimalEq(originalById.get("bridge:waterproofing:membrane")?.quantity, 112)
    && decimalEq(originalById.get("bridge:waterproofing:detail-membrane")?.quantity, 5)
    && decimalEq(originalById.get("bridge:waterproofing:membrane-rolls")?.quantity, 15)
    && decimalEq(originalById.get("bridge:waterproofing:membrane-purchased-area")?.quantity, 120)
    && decimalEq(originalById.get("bridge:waterproofing:primer")?.quantity, 30)
    && decimalEq(originalById.get("bridge:asphalt:continuous-tack-emulsion")?.quantity, 60)
    && decimalEq(originalById.get("bridge:drainage:tubes")?.quantity, 1)
    && decimalEq(originalById.get("bridge:joint:installation")?.quantity, 10)
    && decimalEq(originalById.get("bridge:joint:sealant")?.quantity, 6)
    && decimalEq(originalById.get("bridge:joint:sealant-packages")?.quantity, 1)
    && decimalEq(originalById.get("bridge:joint:primer")?.quantity, 0.5)
    && decimalEq(originalById.get("bridge:joint:backer-cord")?.quantity, 10.5)
    && decimalEq(originalById.get("bridge:joint:backer-cord-coils")?.quantity, 1),
  "CORE_QUANTITY_CHAIN_RED");
  invariant(!originalRows.some((row) => /(?:pile|bearing|girder|abutment|pier)/iu.test(String(row.rowId))),
    "ADJACENT_BRIDGE_STRUCTURE_SCOPE_RED");

  const fullScale = await compile(token, {
    bridge_length_m: 150,
    bridge_width_m: 32,
    area_m2: 4_800,
  }, "Устройство полной системы асфальтобетонного покрытия моста 150 на 32 метра, площадь 4800 м²", runId, "4800m2");
  const fullScaleRows = await allRows(token, fullScale.revisionId);
  const fullScaleById = byId(fullScaleRows);
  invariant(fullScaleRows.length === 194
    && decimalEq(fullScaleById.get("bridge:screed:reinforcement-mesh-cards")?.quantity, 972)
    && decimalEq(fullScaleById.get("bridge:screed:reinforcement-mesh-purchased-area")?.quantity, 5_832)
    && decimalEq(fullScaleById.get("bridge:screed:mesh-cover-compatibility")?.quantity, 3)
    && decimalEq(fullScaleById.get("bridge:screed:formwork-screw-boxes")?.quantity, 15)
    && decimalEq(fullScaleById.get("bridge:screed:formwork-stakes")?.quantity, 364)
    && decimalEq(fullScaleById.get("bridge:screed:formwork-braces")?.quantity, 243)
    && decimalEq(fullScaleById.get("bridge:asphalt:continuous-tack-emulsion")?.quantity, 2_880)
    && decimalEq(fullScaleById.get("bridge:drainage:tubes")?.quantity, 5)
    && decimalEq(fullScaleById.get("bridge:waterproofing:membrane-rolls")?.quantity, 703),
  "FULL_SCALE_QUANTITY_CHAIN_RED");

  const edited = await recalculate(token, original, {
    ...original.parameters,
    area_m2: 160,
    bridge_width_m: 8,
  }, runId, "bridge-width-and-area-edit");
  const editedRows = await allRows(token, edited.revisionId);
  invariant(edited.parentRevisionId === original.revisionId && editedRows.length === 194
    && decimalEq(byId(editedRows).get("bridge:wearing:asphalt:material:hot-dense-fine-mix")?.quantity, 19.328)
    && decimalEq(byId(editedRows).get("bridge:binder:asphalt:material:hot-dense-fine-mix")?.quantity, 19.328)
    && decimalEq(byId(editedRows).get("bridge:joint:installation")?.quantity, 16)
    && decimalEq(byId(editedRows).get("bridge:screed:work:finish-surface")?.quantity, 160)
    && decimalEq(byId(editedRows).get("bridge:screed:material:curing-sheet")?.quantity, 176)
    && decimalEq(byId(editedRows).get("bridge:screed:reinforcement-mesh-cards")?.quantity, 33)
    && decimalEq(byId(editedRows).get("bridge:screed:reinforcement-mesh-purchased-area")?.quantity, 198)
    && decimalEq(byId(editedRows).get("bridge:asphalt:continuous-tack-emulsion")?.quantity, 96),
  "EDIT_LINEAGE_OR_QUANTITY_RED");

  const priced = await recalculate(token, edited, edited.parameters, runId, "binder-mix-price", {
    ...(edited.amendmentContract?.rowOverrides ?? {}),
    "bridge:binder:asphalt:material:hot-dense-fine-mix": {
      unitPrice: 5_000,
      provenance: { kind: "manual", reason: "S27.16 bridge acceptance user-entered supplier price" },
    },
  });
  const pricedRows = await allRows(token, priced.revisionId);
  const pricedBinder = byId(pricedRows).get("bridge:binder:asphalt:material:hot-dense-fine-mix");
  invariant(priced.parentRevisionId === edited.revisionId && pricedRows.length === 194
    && decimalEq(pricedBinder?.unitPrice, 5_000)
    && decimalEq(pricedBinder?.amount, 96_640),
  "PRICE_APPLY_OR_ROW_LOSS_RED");

  const pdf = await artifact(token, original.revisionId, "pdf", runId);
  const text = await pdfText(pdf.bytes);
  invariant(pdf.bytes.subarray(0, 4).toString("ascii") === "%PDF"
    && pdf.metadata.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE"
    && text.includes("Цены не заполнены")
    && !text.includes("Оценено 0,00")
    && !text.includes("Техническое приложение"),
  "PDF_UNKNOWN_PRICE_SEMANTICS_RED");
  const fullScalePdf = await artifact(token, fullScale.revisionId, "pdf", runId);
  const fullScalePdfText = await pdfText(fullScalePdf.bytes);
  invariant(fullScalePdf.bytes.subarray(0, 4).toString("ascii") === "%PDF"
    && fullScalePdf.metadata.metadata?.revisionId === fullScale.revisionId
    && !fullScalePdfText.includes("Техническое приложение")
    && !fullScalePdfText.includes("Оценено 0,00"),
  "FULL_SCALE_PDF_REVISION_OR_TAIL_RED");

  const procurement = await artifact(token, priced.revisionId, "procurement", runId);
  const procurementJson = JSON.parse(procurement.bytes.toString("utf8")) as Json;
  const procurementRows = Array.isArray(procurementJson.rows) ? procurementJson.rows as Json[] : [];
  const procurementIds = new Set(procurementRows.map((row) => String(row.rowId)));
  invariant([
    "bridge:binder:asphalt:material:hot-dense-fine-mix",
    "bridge:wearing:asphalt:material:hot-dense-fine-mix",
    "bridge:screed:material:ready-mix",
    "bridge:screed:reinforcement-mesh-cards",
    "bridge:screed:spacer-packages",
    "bridge:screed:formwork-screw-boxes",
    "bridge:screed:formwork-stakes",
    "bridge:screed:formwork-braces",
    "bridge:waterproofing:primer",
    "bridge:waterproofing:membrane-rolls",
    "bridge:asphalt:continuous-tack-emulsion",
    "bridge:drainage:tubes",
    "bridge:drainage:briquettes",
    "bridge:drainage:sealant-packages",
    "bridge:joint:sealant-packages",
    "bridge:joint:backer-cord-coils",
  ].every((rowId) => procurementIds.has(rowId)),
  "PROCUREMENT_COMPOSITION_RED");
  const fullScaleProcurement = await artifact(token, fullScale.revisionId, "procurement", runId);
  const fullScaleProcurementJson = JSON.parse(fullScaleProcurement.bytes.toString("utf8")) as Json;
  const fullScaleProcurementRows = Array.isArray(fullScaleProcurementJson.rows)
    ? fullScaleProcurementJson.rows as Json[]
    : [];
  invariant(fullScaleProcurementRows.length === procurementRows.length
    && fullScaleProcurementRows.some((row) => row.rowId === "bridge:screed:reinforcement-mesh-cards"
      && decimalEq(row.quantity, 972))
    && fullScaleProcurementRows.some((row) => row.rowId === "bridge:asphalt:continuous-tack-emulsion"
      && decimalEq(row.quantity, 2_880)),
  "FULL_SCALE_PROCUREMENT_RED");

  const history = await api(token,
    `revisions?catalogId=${encodeURIComponent(BRIDGE_ASPHALT_COMPLETE_CATALOG_ID)}&limit=20`);
  invariant((history.revisions as Json[]).some((revision) => revision.revisionId === priced.revisionId),
    "REVISION_HISTORY_RED");

  const categoryCounts = Object.fromEntries([...new Set(originalRows.map((row) => String(row.category)))]
    .map((category) => [category, originalRows.filter((row) => row.category === category).length]));
  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_19_BRIDGE_100M2_BACKEND",
    capturedAt: new Date().toISOString(),
    runId,
    definitionReleaseId: releaseId,
    searchReleaseId,
    runtimeIdentity: runtime.compatibilityTuple,
    search: { prompt, index: searchIndex },
    revisions: {
      originalRevisionId: original.revisionId,
      fullScaleRevisionId: fullScale.revisionId,
      editedRevisionId: edited.revisionId,
      pricedRevisionId: priced.revisionId,
      editedParentRevisionId: edited.parentRevisionId,
      pricedParentRevisionId: priced.parentRevisionId,
    },
    composition: {
      rowCount: originalRows.length,
      categoryCounts,
      preliminaryNeedCount: original.preliminaryNeeds?.length ?? 0,
      zeroQuantityApplicabilityRows: originalRows
        .filter((row) => Number(row.quantity) === 0)
        .map((row) => row.rowId),
      adjacentStructuralScopeExcluded: true,
    },
    quantities: {
      areaM2: 100,
      binderMixT: originalById.get("bridge:binder:asphalt:material:hot-dense-fine-mix")?.quantity,
      wearingMixT: originalById.get("bridge:wearing:asphalt:material:hot-dense-fine-mix")?.quantity,
      editedWearingMixT: byId(editedRows).get("bridge:wearing:asphalt:material:hot-dense-fine-mix")?.quantity,
      screedConcreteM3: originalById.get("bridge:screed:material:ready-mix")?.quantity,
      reinforcementMeshKg: originalById.get("bridge:screed:reinforcement-mesh")?.quantity,
      membraneM2: originalById.get("bridge:waterproofing:membrane")?.quantity,
      membraneDetailM2: originalById.get("bridge:waterproofing:detail-membrane")?.quantity,
      membraneRolls: originalById.get("bridge:waterproofing:membrane-rolls")?.quantity,
      membranePurchasedM2: originalById.get("bridge:waterproofing:membrane-purchased-area")?.quantity,
      primerL: originalById.get("bridge:waterproofing:primer")?.quantity,
      curingSurfaceM2: originalById.get("bridge:screed:work:finish-surface")?.quantity,
      curingSheetM2: originalById.get("bridge:screed:material:curing-sheet")?.quantity,
      jointLengthM: originalById.get("bridge:joint:installation")?.quantity,
      meshCards: originalById.get("bridge:screed:reinforcement-mesh-cards")?.quantity,
      meshPurchasedAreaM2: originalById.get("bridge:screed:reinforcement-mesh-purchased-area")?.quantity,
      continuousTackL: originalById.get("bridge:asphalt:continuous-tack-emulsion")?.quantity,
    },
    fullScaleQuantities: {
      areaM2: 4_800,
      meshCards: fullScaleById.get("bridge:screed:reinforcement-mesh-cards")?.quantity,
      meshPurchasedAreaM2: fullScaleById.get("bridge:screed:reinforcement-mesh-purchased-area")?.quantity,
      meshCoverClearanceMm: fullScaleById.get("bridge:screed:mesh-cover-compatibility")?.quantity,
      tackEmulsionL: fullScaleById.get("bridge:asphalt:continuous-tack-emulsion")?.quantity,
      membraneRolls: fullScaleById.get("bridge:waterproofing:membrane-rolls")?.quantity,
      drainageOutlets: fullScaleById.get("bridge:drainage:tubes")?.quantity,
    },
    pricing: { rowId: pricedBinder?.rowId, unitPrice: pricedBinder?.unitPrice, amount: pricedBinder?.amount },
    procurement: { artifactSha256: procurement.metadata.sha256, rowCount: procurementRows.length },
    fullScaleArtifacts: {
      revisionId: fullScale.revisionId,
      procurementSha256: fullScaleProcurement.metadata.sha256,
      procurementRowCount: fullScaleProcurementRows.length,
      pdfSha256: fullScalePdf.metadata.sha256,
      pdfTechnicalAppendixAbsent: true,
    },
    pdf: {
      artifactSha256: pdf.metadata.sha256,
      byteSize: pdf.bytes.length,
      unknownPriceMessageVerified: true,
      misleadingZeroEstimateAbsent: true,
    },
    historyContainsPricedRevision: true,
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const receipt = { ...unsigned, sha256: sha256(JSON.stringify(stable(unsigned))) };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, receipt);
  process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
