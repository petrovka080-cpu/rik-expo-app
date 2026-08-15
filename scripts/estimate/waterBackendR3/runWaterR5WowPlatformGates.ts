import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a2");
const VISUAL_ROOT = join(EVIDENCE, "water-r6-a2-wow-pdf-visual-50");
const PACKAGE_ROOT = resolve(process.env.BATCH006_PACKAGE_ROOT ?? join(RUNTIME, "03-r6-a2-release-a"));
const MANIFEST = JSON.parse(readFileSync(join(PACKAGE_ROOT, "manifest.json"), "utf8")) as Json;
const RELEASE_ID = String(process.env.BATCH006_RELEASE_ID ?? MANIFEST.releaseId);
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!EXPECTED_DATABASE || decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")) !== EXPECTED_DATABASE
  || !/^batch006_water_r6_a2_[ab]$/.test(EXPECTED_DATABASE)) throw new Error("BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED");
const API_ROOT = String(process.env.BATCH006_API_ROOT ?? "http://127.0.0.1:8776/canonical-estimate").replace(/\/$/, "");
const TOKEN = process.env.BATCH006_TEST_TOKEN ?? "batch006-disposable-water-tenant";
const ADMISSION_RUN_ID = process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID ?? "batch006-water-r6-a2-final-admission";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_OWNER_ID = "99999999-9999-4999-8999-999999999999";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type Json = Record<string, any>;
type Scenario = { catalog_id: string; scenario_id: string; parameter_set: Json; reached_row_ids: string[] };

function stable(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer | unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(name: string, values: readonly unknown[]): void {
  writeFileSync(join(EVIDENCE, name), `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

async function api(path: string, init: RequestInit = {}, authenticated = true): Promise<{ status: number; body: Json; bytes: Buffer; headers: Headers }> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(authenticated ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let body: Json = {};
  try { body = JSON.parse(bytes.toString("utf8")) as Json; } catch { /* binary */ }
  return { status: response.status, body, bytes, headers: response.headers };
}

async function waitJob(jobId: string, timeoutMs = 240_000): Promise<Json> {
  const deadline = Date.now() + timeoutMs;
  let latest: Json = {};
  while (Date.now() < deadline) {
    const response = await api(`jobs/${jobId}`);
    latest = response.body;
    if (["succeeded", "failed", "cancelled"].includes(String(latest.status))) return latest;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`WATER_WOW_JOB_TIMEOUT:${jobId}:${stable(latest)}`);
}

async function allRevisionRows(revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const response = await api(`revisions/${revisionId}/rows?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    if (response.status !== 200) throw new Error(`WATER_WOW_ROWS_RED:${revisionId}:${stable(response.body)}`);
    rows.push(...response.body.rows);
    cursor = response.body.nextCursor ?? null;
  } while (cursor);
  return rows;
}

async function readJsonl(name: string): Promise<Json[]> {
  const rows: Json[] = [];
  const lines = createInterface({ input: createReadStream(join(EVIDENCE, name), { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const raw of lines) if (raw.trim()) rows.push(JSON.parse(raw) as Json);
  return rows;
}

function chooseCases(classification: Json[], lowDepthIds: Set<string>): Json[] {
  const byId = new Map(classification.map((row) => [String(row.catalog_id), row]));
  const selected: Json[] = [];
  const seen = new Set<string>();
  const add = (row: Json | undefined): void => {
    if (!row || seen.has(String(row.catalog_id))) return;
    selected.push(row);
    seen.add(String(row.catalog_id));
  };
  classification.filter((row) => row.namespace === "external_reference")
    .sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id))).forEach(add);
  [...lowDepthIds].sort().slice(0, 15).forEach((id) => add(byId.get(id)));
  for (const complexity of ["L1", "L2", "L3", "L4", "L5"]) {
    classification.filter((row) => row.complexity_class === complexity)
      .sort((left, right) => Number(right.resource_count) - Number(left.resource_count)
        || String(left.catalog_id).localeCompare(String(right.catalog_id)))
      .forEach((row) => { if (selected.length < 50) add(row); });
  }
  if (selected.length !== 50 || seen.size !== 50
    || selected.filter((row) => row.namespace === "external_reference").length !== 29
    || selected.filter((row) => lowDepthIds.has(String(row.catalog_id))).length < 15) {
    throw new Error(`WATER_WOW_50_SELECTION_RED:${selected.length}:${seen.size}`);
  }
  return selected;
}

async function scenariosFor(ids: Set<string>): Promise<Map<string, Scenario[]>> {
  const result = new Map<string, Scenario[]>();
  const lines = createInterface({ input: createReadStream(join(EVIDENCE, "WATER_CONSTRAINT_AWARE_SCENARIOS.jsonl"), { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const raw of lines) {
    if (!raw.trim()) continue;
    const row = JSON.parse(raw) as Scenario;
    if (!ids.has(row.catalog_id)) continue;
    const values = result.get(row.catalog_id) ?? [];
    values.push(row);
    result.set(row.catalog_id, values);
  }
  if (result.size !== ids.size || [...result.values()].some((values) => values.length < 2)) throw new Error("WATER_WOW_SCENARIOS_RED");
  return result;
}

async function fingerprintPredecessors(client: Client): Promise<Json> {
  return (await client.query(`
    select
      (select jsonb_agg(jsonb_build_object('id',id,'status',status,'manifest',source_manifest_sha256,'package',source_package_sha256,'definitions',definition_count,'parameters',parameter_count,'formulas',formula_count,'resources',resource_row_count) order by id)
       from public.estimate_definition_release where id=any($1::uuid[])) releases,
      (select count(*)::integer from public.estimate_revision where release_id=$2) r1_revisions,
      (select count(*)::integer from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$2) r1_rows,
      (select encode(extensions.digest(convert_to(coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex') from public.estimate_revision r where r.release_id=$2) r1_revisions_sha256,
      (select count(*)::integer from public.estimate_definition_version where release_id=$3) r2_definitions,
      (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$3) r2_resources
  `, [[R1_RELEASE_ID, R2_RELEASE_ID], R1_RELEASE_ID, R2_RELEASE_ID])).rows[0] as Json;
}

async function renderPdfVisual(bytes: Buffer, catalogId: string): Promise<Json> {
  Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1.35 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvas: canvas as any, canvasContext: context as any, viewport }).promise;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonWhite = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) nonWhite += 1;
  }
  const png = canvas.toBuffer("image/png");
  const pages = document.numPages;
  const file = `${catalogId.replace(/[^a-zA-Z0-9._-]+/g, "_")}.png`;
  writeFileSync(join(VISUAL_ROOT, file), png);
  await document.destroy();
  return { file: `water-r6-a2-wow-pdf-visual-50/${file}`, pages, width: canvas.width, height: canvas.height, nonWhitePixels: nonWhite, bytes: png.length, sha256: sha256(png), status: nonWhite > 5_000 ? "GREEN" : "RED" };
}

async function artifact(revisionId: string, kind: "pdf" | "procurement", idempotencyKey: string): Promise<{ metadata: Json; bytes: Buffer }> {
  const accepted = await api(`revisions/${revisionId}/artifacts/${kind}`, { method: "POST", body: JSON.stringify({ idempotencyKey }) });
  if (accepted.status !== 202) throw new Error(`WATER_WOW_ARTIFACT_ACCEPT_RED:${kind}:${stable(accepted.body)}`);
  if (accepted.body.jobId != null) {
    const terminal = await waitJob(String(accepted.body.jobId));
    if (terminal.status !== "succeeded") throw new Error(`WATER_WOW_ARTIFACT_JOB_RED:${kind}:${stable(terminal)}`);
  } else if (accepted.body.artifactStatus !== "ready") {
    throw new Error(`WATER_WOW_ARTIFACT_REPLAY_RED:${kind}:${stable(accepted.body)}`);
  }
  const ready = await api(`revisions/${revisionId}/artifacts/${kind}`);
  if (ready.status !== 200 || ready.body.status !== "ready" || ready.body.releaseId !== RELEASE_ID
    || ready.body.metadata?.sourceReleaseId !== RELEASE_ID || !/^[0-9a-f]{64}$/.test(String(ready.body.sha256))) {
    throw new Error(`WATER_WOW_ARTIFACT_IDENTITY_RED:${kind}:${stable(ready.body)}`);
  }
  const download = await fetch(String(ready.body.signedUrl));
  const bytes = Buffer.from(await download.arrayBuffer());
  if (!download.ok || bytes.length !== Number(ready.body.byteSize) || sha256(bytes) !== ready.body.sha256) throw new Error(`WATER_WOW_ARTIFACT_BYTES_RED:${kind}`);
  return { metadata: ready.body, bytes };
}

async function structuralAll(client: Client): Promise<Json[]> {
  const result = await client.query(`
    with latest as (
      select distinct on (j.catalog_id) j.catalog_id,j.result_revision_id
      from public.estimate_compile_job j
      where j.target_release_id=$1 and j.idempotency_key like 'batch006-r6-a2-%' and j.status='succeeded' and j.result_revision_id is not null
      order by j.catalog_id,j.completed_at desc,j.id desc
    )
    select l.catalog_id,r.id revision_id,r.release_id,r.row_count,
           count(rr.*)::integer projected_pdf_rows,
           count(rr.*) filter (where rr.procurement_eligible and rr.included_in_procurement)::integer projected_procurement_rows,
           count(distinct rr.row_id)::integer distinct_rows,
           r.checksum_sha256
    from latest l join public.estimate_revision r on r.id=l.result_revision_id
    join public.estimate_revision_row rr on rr.revision_id=r.id and rr.included_in_estimate
    group by l.catalog_id,r.id
    order by l.catalog_id
  `, [RELEASE_ID]);
  const rows = result.rows.map((row) => ({
    ...row,
    release_exact: row.release_id === RELEASE_ID,
    pdf_projection_exact: Number(row.projected_pdf_rows) === Number(row.row_count),
    rows_unique: Number(row.distinct_rows) === Number(row.row_count),
    procurement_projection_nonnegative: Number(row.projected_procurement_rows) >= 0,
    structural_sha256: sha256(row),
    status: row.release_id === RELEASE_ID && Number(row.projected_pdf_rows) === Number(row.row_count)
      && Number(row.distinct_rows) === Number(row.row_count) && Number(row.projected_procurement_rows) >= 0 ? "GREEN" : "RED",
  }));
  if (rows.length !== Number(MANIFEST.waterDelta.definitions) || rows.some((row) => row.status !== "GREEN")) throw new Error(`WATER_ALL_ARTIFACT_STRUCTURE_RED:${rows.length}`);
  return rows;
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  mkdirSync(VISUAL_ROOT, { recursive: true });
  if (RELEASE_ID !== MANIFEST.releaseId) throw new Error("WATER_WOW_RELEASE_MANIFEST_MISMATCH");
  const classification = (await readJsonl("A2_04_PER_ID_BEFORE_AFTER.jsonl")).map((row) => ({
    ...row,
    complexity_class: row.complexity_after,
    resource_count: row.resource_rows_after,
    family: row.owner_family,
  }));
  const lowDepthIds = new Set((await readJsonl("A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl")).map((row) => String(row.catalog_id)));
  const selected = chooseCases(classification, lowDepthIds);
  const scenarioMap = await scenariosFor(new Set(selected.map((row) => String(row.catalog_id))));
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r6-a2-wow-platform-gates" });
  await client.connect();
  try {
    const predecessorBefore = await fingerprintPredecessors(client);
    const structural = await structuralAll(client);
    writeJsonl("A2_10_PDF_PROCUREMENT_STRUCTURAL_PARITY_ALL.jsonl", structural);

    const cases: Json[] = [];
    const visuals: Json[] = [];
    const originalCreateRequests: Array<{ key: string; body: Json; jobId: string }> = [];
    for (const [caseIndex, descriptor] of selected.entries()) {
      const catalogId = String(descriptor.catalog_id);
      const scenario = scenarioMap.get(catalogId)![0];
      const createBody = { idempotencyKey: `wow-r6-a2-create-${caseIndex}-${sha256(catalogId).slice(0, 20)}`, catalogId, parameters: scenario.parameter_set, currencyCode: "KGS", priceSnapshotIds: [] };
      const started = performance.now();
      const createAccepted = await api("jobs/compile", { method: "POST", body: JSON.stringify(createBody) });
      if (createAccepted.status !== 202) throw new Error(`WATER_WOW_CREATE_ACCEPT_RED:${catalogId}:${stable(createAccepted.body)}`);
      const createJob = await waitJob(String(createAccepted.body.jobId));
      if (createJob.status !== "succeeded") throw new Error(`WATER_WOW_CREATE_RED:${catalogId}:${stable(createJob)}`);
      const createDurationMs = performance.now() - started;
      originalCreateRequests.push({ key: createBody.idempotencyKey, body: createBody, jobId: String(createAccepted.body.jobId) });
      const parentId = String(createJob.resultRevisionId);
      const parentBefore = await api(`revisions/${parentId}`);
      const parentRows = await allRevisionRows(parentId);
      const override = parentRows.find((row) => row.quantity != null);
      if (!override) throw new Error(`WATER_WOW_OVERRIDE_TARGET_RED:${catalogId}`);
      const editBody = {
        idempotencyKey: `wow-r6-a2-edit-${caseIndex}-${sha256(catalogId).slice(0, 20)}`,
        catalogId,
        parentRevisionId: parentId,
        parameters: scenario.parameter_set,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        rowOverrides: {
          [override.rowId]: {
            quantity: String(Number(override.quantity) + 1),
            unitPrice: "100",
            includedInEstimate: true,
            includedInProcurement: override.procurementEligible === true,
            provenance: { kind: "manual", reason: `R6 A2 WOW controlled edit ${caseIndex + 1}` },
          },
        },
      };
      const recalculateStarted = performance.now();
      const editAccepted = await api("jobs/recalculate", { method: "POST", body: JSON.stringify(editBody) });
      if (editAccepted.status !== 202) throw new Error(`WATER_WOW_EDIT_ACCEPT_RED:${catalogId}:${stable(editAccepted.body)}`);
      const editJob = await waitJob(String(editAccepted.body.jobId));
      if (editJob.status !== "succeeded") throw new Error(`WATER_WOW_EDIT_RED:${catalogId}:${stable(editJob)}`);
      const recalculateDurationMs = performance.now() - recalculateStarted;
      const childId = String(editJob.resultRevisionId);
      const historyReopenStarted = performance.now();
      const child = await api(`revisions/${childId}`);
      const childRows = await allRevisionRows(childId);
      const overridden = childRows.find((row) => row.rowId === override.rowId);
      const parentAfter = await api(`revisions/${parentId}`);
      const historyReopenMs = performance.now() - historyReopenStarted;
      if (parentBefore.body.releaseId !== RELEASE_ID || child.body.releaseId !== RELEASE_ID
        || child.body.parentRevisionId !== parentId || parentBefore.body.checksumSha256 !== parentAfter.body.checksumSha256
        || overridden?.unitPrice !== "100.000000") throw new Error(`WATER_WOW_LINEAGE_RED:${catalogId}`);

      let immutableRejected = false;
      await client.query("begin");
      try {
        await client.query("update public.estimate_revision set row_count=row_count+1 where id=$1", [parentId]);
      } catch {
        immutableRejected = true;
      } finally {
        await client.query("rollback");
      }
      if (!immutableRejected) throw new Error(`WATER_WOW_IMMUTABILITY_RED:${catalogId}`);
      const pdfStarted = performance.now();
      const pdf = await artifact(childId, "pdf", `wow-r6-a2-pdf-${caseIndex}-${sha256(childId).slice(0, 16)}`);
      const pdfDurationMs = performance.now() - pdfStarted;
      const procurementStarted = performance.now();
      const procurement = await artifact(childId, "procurement", `wow-r6-a2-proc-${caseIndex}-${sha256(childId).slice(0, 16)}`);
      const procurementDurationMs = performance.now() - procurementStarted;
      if (pdf.bytes.subarray(0, 4).toString("latin1") !== "%PDF") throw new Error(`WATER_WOW_PDF_SIGNATURE_RED:${catalogId}`);
      const procurementPayload = JSON.parse(procurement.bytes.toString("utf8")) as Json;
      if (procurementPayload.releaseId !== RELEASE_ID || procurementPayload.revisionId !== childId) throw new Error(`WATER_WOW_PROCUREMENT_RELEASE_RED:${catalogId}`);
      const visual = await renderPdfVisual(pdf.bytes, catalogId);
      visuals.push({ catalog_id: catalogId, revision_id: childId, release_id: RELEASE_ID, ...visual });
      if (visual.status !== "GREEN") throw new Error(`WATER_WOW_PDF_VISUAL_RED:${catalogId}`);
      cases.push({
        case: caseIndex + 1,
        catalog_id: catalogId,
        complexity_class: descriptor.complexity_class,
        source_domain_id: descriptor.source_domain_id,
        create_job_id: createAccepted.body.jobId,
        parent_revision_id: parentId,
        edit_job_id: editAccepted.body.jobId,
        child_revision_id: childId,
        immutable_parent_rejected: immutableRejected,
        parent_checksum_before: parentBefore.body.checksumSha256,
        parent_checksum_after: parentAfter.body.checksumSha256,
        child_parent_exact: child.body.parentRevisionId === parentId,
        parent_rows: parentRows.length,
        child_rows: childRows.length,
        pdf: { sha256: pdf.metadata.sha256, bytes: pdf.bytes.length, releaseId: pdf.metadata.releaseId },
        procurement: { sha256: procurement.metadata.sha256, bytes: procurement.bytes.length, releaseId: procurementPayload.releaseId, rows: procurementPayload.rows.length },
        timings_ms: { create: Math.round(createDurationMs), recalculate: Math.round(recalculateDurationMs),
          history_reopen: Math.round(historyReopenMs), pdf: Math.round(pdfDurationMs), procurement: Math.round(procurementDurationMs) },
        duration_ms: Math.round(performance.now() - started),
        status: "GREEN",
      });
      process.stdout.write(`[${new Date().toISOString()}] Water WOW ${caseIndex + 1}/50 ${catalogId}\n`);
    }
    writeJsonl("A2_10_WOW_50_CASES.jsonl", cases);
    writeJsonl("A2_10_PDF_VISUAL_INSPECTION_50.jsonl", visuals);

    const idempotencyReplay: Json[] = [];
    for (const request of originalCreateRequests) {
      const firstReplay = await api("jobs/compile", { method: "POST", body: JSON.stringify(request.body) });
      const secondReplay = await api("jobs/compile", { method: "POST", body: JSON.stringify(request.body) });
      idempotencyReplay.push({ idempotency_key: request.key, original_job_id: request.jobId, replay_1_job_id: firstReplay.body.jobId, replay_2_job_id: secondReplay.body.jobId, status: firstReplay.body.jobId === request.jobId && secondReplay.body.jobId === request.jobId ? "GREEN" : "RED" });
    }
    if (idempotencyReplay.some((row) => row.status !== "GREEN")) throw new Error("WATER_WOW_OFFLINE_REPLAY_RED");
    writeJson("A2_10_OFFLINE_OUTBOX_REPLAY.json", { schemaVersion: "water-r6-a2-offline-outbox-replay.v1", requests: 50, passes: 2, rows: idempotencyReplay, duplicateJobs: 0, status: "GREEN" });

    const idempotency = originalCreateRequests[0];
    const conflict = await api("jobs/compile", { method: "POST", body: JSON.stringify({ ...idempotency.body, parameters: { ...idempotency.body.parameters, __unknown: 1 } }) });
    if (conflict.status !== 409 || conflict.body?.error?.code !== "IDEMPOTENCY_PAYLOAD_CONFLICT") {
      throw new Error(`WATER_WOW_IDEMPOTENCY_CONFLICT_RED:${stable(conflict)}`);
    }

    const concurrencyParent = cases[0];
    const concurrencyScenario = scenarioMap.get(concurrencyParent.catalog_id)![0];
    const concurrencySeed = await api("jobs/compile", { method: "POST", body: JSON.stringify({
      idempotencyKey: `wow-r6-a2-concurrency-seed-${Date.now()}`,
      catalogId: concurrencyParent.catalog_id,
      parameters: concurrencyScenario.parameter_set,
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }) });
    if (concurrencySeed.status !== 202) throw new Error(`WATER_WOW_CONCURRENCY_SEED_ACCEPT_RED:${stable(concurrencySeed)}`);
    const concurrencySeedJob = await waitJob(String(concurrencySeed.body.jobId));
    if (concurrencySeedJob.status !== "succeeded") throw new Error(`WATER_WOW_CONCURRENCY_SEED_RED:${stable(concurrencySeedJob)}`);
    const concurrencyPayload = { catalogId: concurrencyParent.catalog_id, parentRevisionId: concurrencySeedJob.resultRevisionId, parameters: concurrencyScenario.parameter_set, currencyCode: "KGS", priceSnapshotIds: [] };
    const concurrentAccepted = await Promise.all([
      api("jobs/recalculate", { method: "POST", body: JSON.stringify({ ...concurrencyPayload, idempotencyKey: `wow-r6-a2-concurrent-a-${Date.now()}` }) }),
      api("jobs/recalculate", { method: "POST", body: JSON.stringify({ ...concurrencyPayload, idempotencyKey: `wow-r6-a2-concurrent-b-${Date.now()}` }) }),
    ]);
    const concurrentTerminal = await Promise.all(concurrentAccepted.map((accepted) => waitJob(String(accepted.body.jobId))));
    const succeeded = concurrentTerminal.filter((job) => job.status === "succeeded").length;
    const failed = concurrentTerminal.filter((job) => job.status === "failed").length;
    if (succeeded !== 1 || failed !== 1) throw new Error(`WATER_WOW_OPTIMISTIC_CONCURRENCY_RED:${stable(concurrentTerminal)}`);

    const cancellationScenario = scenarioMap.get(cases[1].catalog_id)![0];
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
    const cancellation = (await client.query(`select * from public.estimate_create_release_admission_job_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`, [
      RELEASE_ID, "water_supply_sewerage", ADMISSION_RUN_ID, OWNER_ID, ORGANIZATION_ID,
      `wow-r6-a2-cancel-${Date.now()}`, "compile", cases[1].catalog_id, null,
      JSON.stringify({ parameters: cancellationScenario.parameter_set, currencyCode: "KGS", priceSnapshotIds: [], apiVersion: "2026-08-14.r2" }),
    ])).rows[0];
    const cancelled = (await client.query("select public.estimate_cancel_compile_job_v1($1) cancelled", [cancellation.job_id])).rows[0]?.cancelled === true;
    await client.query("commit");
    if (!cancelled) throw new Error("WATER_WOW_CANCELLATION_RED");

    const leaseScenario = scenarioMap.get(cases[2].catalog_id)![0];
    const leaseIdempotencyKey = `wow-r6-a2-lease-${Date.now()}`;
    await client.query("begin");
    const leaseCreated = (await client.query(`select * from public.estimate_create_release_admission_job_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`, [
      RELEASE_ID, "water_supply_sewerage", ADMISSION_RUN_ID, OWNER_ID, ORGANIZATION_ID,
      leaseIdempotencyKey, "compile", cases[2].catalog_id, null,
      JSON.stringify({ parameters: leaseScenario.parameter_set, currencyCode: "KGS", priceSnapshotIds: [], apiVersion: "2026-08-14.r2" }),
    ])).rows[0];
    const claimed = (await client.query("select * from public.estimate_claim_compile_jobs_v1($1,1,15)", ["batch006-crashed-worker"])).rows[0];
    if (!claimed || String(claimed.id) !== String(leaseCreated.job_id)) throw new Error("WATER_WOW_LEASE_CLAIM_RED");
    await client.query("update public.estimate_compile_job set lease_expires_at=now()-interval '1 second' where id=$1", [leaseCreated.job_id]);
    let staleWorkerFenced = false;
    await client.query("savepoint stale_worker");
    try {
      await client.query("select public.estimate_commit_compile_job_v1($1,$2,$3::jsonb,$4::jsonb)", [leaseCreated.job_id, "batch006-crashed-worker", "{}", "[]"]);
    } catch {
      staleWorkerFenced = true;
      await client.query("rollback to savepoint stale_worker");
    }
    await client.query("commit");
    const recoveryWake = await api("jobs/compile", { method: "POST", body: JSON.stringify({
      idempotencyKey: leaseIdempotencyKey,
      catalogId: cases[2].catalog_id,
      parameters: leaseScenario.parameter_set,
      currencyCode: "KGS",
      priceSnapshotIds: [],
      organizationId: ORGANIZATION_ID,
    }) });
    if (recoveryWake.status !== 202 || String(recoveryWake.body.jobId) !== String(leaseCreated.job_id)) {
      throw new Error(`WATER_WOW_LEASE_RECOVERY_WAKE_RED:${stable(recoveryWake)}`);
    }
    const recoveredLeaseJob = await waitJob(String(leaseCreated.job_id));
    if (!staleWorkerFenced || recoveredLeaseJob.status !== "succeeded" || Number(recoveredLeaseJob.attempt) < 2) throw new Error(`WATER_WOW_LEASE_RECOVERY_RED:${stable(recoveredLeaseJob)}`);

    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OTHER_OWNER_ID]);
    const rlsForeign = Number((await client.query("select count(*)::integer count from public.estimate_revision where id=any($1::uuid[])", [cases.flatMap((row) => [row.parent_revision_id, row.child_revision_id])])).rows[0].count);
    await client.query("rollback");
    const unauthenticated = await api("catalog?query=water", {}, false);
    const edgeSource = readFileSync(join(ROOT, "supabase", "functions", "canonical-estimate", "index.ts"), "utf8");
    const security = {
      foreignTenantVisibleRevisions: rlsForeign,
      unauthenticatedStatus: unauthenticated.status,
      explicitCorsAllowlist: edgeSource.includes("ESTIMATE_ALLOWED_ORIGINS"),
      wildcardCorsAbsent: !edgeSource.includes('"Access-Control-Allow-Origin": "*"'),
    };
    if (rlsForeign !== 0 || unauthenticated.status !== 401 || !security.explicitCorsAllowlist || !security.wildcardCorsAbsent) throw new Error(`WATER_WOW_SECURITY_RED:${stable(security)}`);

    const lookupDurations: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const tick = performance.now();
      const response = await api("catalog?domain=water_supply_sewerage&limit=30");
      lookupDurations.push(performance.now() - tick);
      if (response.status !== 200) throw new Error("WATER_WOW_LOOKUP_RED");
    }
    lookupDurations.sort((left, right) => left - right);
    const p95 = lookupDurations[Math.floor(lookupDurations.length * 0.95)];
    const maxCompileMs = Math.max(...cases.map((row) => Number(row.duration_ms)));
    if (p95 >= 2_000 || maxCompileMs >= 240_000) throw new Error(`WATER_WOW_PERFORMANCE_RED:${p95}:${maxCompileMs}`);

    const predecessorAfter = await fingerprintPredecessors(client);
    const predecessorsUnchanged = stable(predecessorBefore) === stable(predecessorAfter);
    if (!predecessorsUnchanged) throw new Error("WATER_WOW_PREDECESSOR_PRESERVATION_RED");
    const report = {
      schemaVersion: "water-r6-a2-wow-platform-gates.v1",
      releaseId: RELEASE_ID,
      cases: { expected: 50, green: cases.length, distinct: new Set(cases.map((row) => row.catalog_id)).size,
        external: cases.filter((row) => String(row.catalog_id).startsWith("water-a2:")).length,
        formerLowDepth: cases.filter((row) => lowDepthIds.has(String(row.catalog_id))).length },
      structuralArtifactParity: { expected: Number(MANIFEST.waterDelta.definitions), green: structural.length },
      realPdfVisuals: { expected: 50, green: visuals.filter((row) => row.status === "GREEN").length },
      immutableHistory: { parentChildChains: 50, mutationRejected: cases.filter((row) => row.immutable_parent_rejected).length },
      exactReleaseArtifacts: cases.every((row) => row.pdf.releaseId === RELEASE_ID && row.procurement.releaseId === RELEASE_ID),
      r1r2Preservation: { before: predecessorBefore, after: predecessorAfter, unchanged: predecessorsUnchanged },
      security,
      idempotency: { replayedTwice: 50, duplicateJobs: 0, conflictingPayloadStatus: conflict.status },
      optimisticConcurrency: { succeeded, failed },
      workerCancellation: { jobId: cancellation.job_id, cancelled },
      expiredLeaseRecovery: { jobId: leaseCreated.job_id, staleWorkerFenced, attempt: recoveredLeaseJob.attempt, status: recoveredLeaseJob.status },
      offlineOutbox: { requests: 50, replayPasses: 2, duplicateJobs: 0 },
      performance: { catalogLookupP95Ms: Math.round(p95 * 100) / 100, maximumWowCaseMs: maxCompileMs, catalogBudgetMs: 2_000, compileBudgetMs: 240_000 },
      productionDeployed: false,
      batch007Started: false,
      status: "GREEN",
    };
    writeJson("A2_10_WOW_PLATFORM_GATES.json", report);
    writeJson("A2_10_SECURITY_CONCURRENCY_LEASE_OFFLINE_PROOF.json", {
      schemaVersion: "water-r6-a2-security-concurrency-lease-offline.v1",
      releaseId: RELEASE_ID,
      security,
      idempotency: report.idempotency,
      optimisticConcurrency: report.optimisticConcurrency,
      workerCancellation: report.workerCancellation,
      expiredLeaseRecovery: report.expiredLeaseRecovery,
      offlineOutbox: report.offlineOutbox,
      status: "GREEN",
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
