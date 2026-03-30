import fs from "node:fs";
import path from "node:path";

import { createVerifierAdmin } from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;
type UnknownRow = Record<string, unknown>;

type SourceBoundaryKey =
  | "incomingFormRpcOnly"
  | "dayMaterialsRpcOnly"
  | "incomingMaterialsRpcOnly"
  | "objectWorkRpcOnly";

type CheckResult = {
  name: string;
  sampled: boolean;
  parityOk: boolean;
  details: JsonRecord;
};

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "warehouse-pdf-source-cutover-v1");
const admin = createVerifierAdmin("warehouse-pdf-source-cutover-v1");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const extractBlock = (source: string, marker: string) => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const bodyStart = source.indexOf("{", markerIndex);
  if (bodyStart < 0) return "";
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(markerIndex, index + 1);
      }
    }
  }
  return source.slice(markerIndex);
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asRecordArray = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const asText = (value: unknown) => String(value ?? "").trim();

const asTextOrNull = (value: unknown) => {
  const text = asText(value);
  return text || null;
};

const asNumber = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const round3 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

const toDayRange = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid event_dt for range: ${value}`);
  }
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const pdf = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
  return {
    pdfFrom: pdf,
    pdfTo: pdf,
    rpcFrom: from.toISOString(),
    rpcTo: to.toISOString(),
  };
};

const sortSignature = (values: string[]) => [...values].sort();

const sameSignatureSet = (left: string[], right: string[]) =>
  JSON.stringify(sortSignature(left)) === JSON.stringify(sortSignature(right));

const fetchCanonicalIncomingForm = async (incomingId: string) => {
  const result = await admin.rpc("pdf_warehouse_incoming_source_v1", {
    p_incoming_id: incomingId,
  });
  if (result.error) throw result.error;
  const root = asRecord(result.data);
  return {
    source: "rpc:pdf_warehouse_incoming_source_v1",
    incoming: asRecord(root.header),
    lines: asRecordArray(root.rows).map((row) => ({
      ...row,
      qty_received: asNumber(row.qty_received ?? row.qty),
      uom: asText(row.uom ?? row.uom_id),
    })),
  };
};

const fetchCanonicalIncomingMaterials = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("pdf_warehouse_incoming_materials_source_v1", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
  });
  if (result.error) throw result.error;
  const root = asRecord(result.data);
  return {
    source: "rpc:pdf_warehouse_incoming_materials_source_v1",
    rows: asRecordArray(root.rows),
    docsTotal: Math.max(0, Math.round(asNumber(asRecord(root.totals).docs_total))),
  };
};

const fetchCanonicalDayMaterials = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("pdf_warehouse_day_materials_source_v1", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
  });
  if (result.error) throw result.error;
  const root = asRecord(result.data);
  return {
    source: "rpc:pdf_warehouse_day_materials_source_v1",
    rows: asRecordArray(root.rows),
    docsTotal: Math.max(0, Math.round(asNumber(asRecord(root.totals).docs_total))),
  };
};

const fetchCanonicalObjectWork = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("pdf_warehouse_object_work_source_v1", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
    p_object_id: null,
  });
  if (result.error) throw result.error;
  const root = asRecord(result.data);
  return {
    source: "rpc:pdf_warehouse_object_work_source_v1",
    rows: asRecordArray(root.rows),
    docsTotal: Math.max(0, Math.round(asNumber(asRecord(root.totals).docs_total))),
  };
};

const fetchLegacyIncomingLines = async (incomingId: string) => {
  const result = await admin
    .from("wh_ledger")
    .select("code, uom_id, qty")
    .eq("incoming_id", incomingId)
    .eq("direction", "in");

  if (result.error) throw result.error;
  return asRecordArray(result.data).map((row) => ({
    ...row,
    uom: asText(row.uom_id),
    qty_received: asNumber(row.qty),
  }));
};

const fetchLegacyIncomingMaterials = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin
    .from("wh_ledger")
    .select("code, uom_id, qty")
    .eq("direction", "in")
    .gte("moved_at", range.rpcFrom)
    .lte("moved_at", range.rpcTo);

  if (result.error) throw result.error;

  const groups = new Map<string, UnknownRow>();
  for (const row of asRecordArray(result.data)) {
    const code = asText(row.code).toUpperCase();
    const uom = asText(row.uom_id);
    if (!code) continue;
    const key = `${code}|${uom}`;
    const current = groups.get(key) ?? {
      material_code: code,
      material_name: code,
      uom,
      sum_total: 0,
      docs_cnt: 0,
      lines_cnt: 0,
    };
    current.sum_total = asNumber(current.sum_total) + asNumber(row.qty);
    current.lines_cnt = asNumber(current.lines_cnt) + 1;
    groups.set(key, current);
  }

  return [...groups.values()];
};

const fetchLegacyIssuedMaterials = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("wh_report_issued_materials_fast", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
    p_object_id: null,
  });
  if (result.error) throw result.error;
  return asRecordArray(result.data);
};

const fetchLegacyObjectWork = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("wh_report_issued_by_object_fast", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
    p_object_id: null,
  });
  if (result.error) throw result.error;
  return asRecordArray(result.data);
};

const findLatestIncomingHead = async () => {
  const result = await admin
    .from("wh_ledger")
    .select("incoming_id,moved_at")
    .eq("direction", "in")
    .not("incoming_id", "is", null)
    .order("moved_at", { ascending: false })
    .limit(1);
  if (result.error) throw result.error;
  const row = asRecordArray(result.data)[0] ?? null;
  if (!row) return null;
  return {
    incoming_id: asText(row.incoming_id),
    event_dt: asText(row.moved_at),
  };
};

const findIncomingHeadsInRange = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("acc_report_incoming_v2", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
  });
  if (result.error) throw result.error;
  return asRecordArray(result.data);
};

const findLatestIssueHead = async () => {
  const result = await admin
    .from("warehouse_issues")
    .select("id,iss_date")
    .not("iss_date", "is", null)
    .order("iss_date", { ascending: false })
    .limit(1);
  if (result.error) throw result.error;
  const row = asRecordArray(result.data)[0] ?? null;
  if (!row) return null;
  return {
    issue_id: asText(row.id),
    event_dt: asText(row.iss_date),
  };
};

const findIssueHeadsInRange = async (range: { rpcFrom: string; rpcTo: string }) => {
  const result = await admin.rpc("acc_report_issues_v2", {
    p_from: range.rpcFrom,
    p_to: range.rpcTo,
  });
  if (result.error) throw result.error;
  return asRecordArray(result.data);
};

const incomingLineSignature = (row: UnknownRow) =>
  [
    asText(row.code).toUpperCase(),
    asText(row.uom ?? row.uom_id),
    round3(asNumber(row.qty_received ?? row.qty)),
  ].join("|");

const incomingMaterialsSignature = (row: UnknownRow) =>
  [
    asText(row.material_code).toUpperCase(),
    asText(row.uom),
    round3(asNumber(row.sum_total)),
    round3(asNumber(row.lines_cnt)),
  ].join("|");

const dayMaterialsSignature = (row: UnknownRow) =>
  [
    asText(row.material_code).toUpperCase(),
    asText(row.uom),
    round3(asNumber(row.sum_in_req)),
    round3(asNumber(row.sum_free)),
    round3(asNumber(row.sum_over)),
    round3(asNumber(row.sum_total)),
    round3(asNumber(row.docs_cnt)),
    round3(asNumber(row.lines_cnt)),
  ].join("|");

const objectWorkSignature = (row: UnknownRow) =>
  [
    asTextOrNull(row.object_id) ?? "",
    asText(row.object_name),
    asText(row.work_name),
    round3(asNumber(row.docs_cnt)),
    round3(asNumber(row.req_cnt)),
    round3(asNumber(row.active_days)),
    round3(asNumber(row.uniq_materials)),
  ].join("|");

const inspectSourceBoundary = () => {
  const specs: Array<{
    key: SourceBoundaryKey;
    path: string;
    getterMarker: string;
    forbidden: string[];
  }> = [
    {
      key: "incomingFormRpcOnly",
      path: "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
      getterMarker: "export async function getWarehouseIncomingFormPdfSource(",
      forbidden: ["legacy:", "legacy_fallback", "fetchWarehouseIncomingFormPdfSourceFallback", "apiFetchIncomingLines"],
    },
    {
      key: "dayMaterialsRpcOnly",
      path: "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
      getterMarker: "export async function getWarehouseDayMaterialsReportPdfSource(",
      forbidden: ["legacy:", "legacy_fallback", "fetchWarehouseDayMaterialsReportPdfSourceFallback", "apiFetchIssuedMaterialsReportFast"],
    },
    {
      key: "incomingMaterialsRpcOnly",
      path: "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
      getterMarker: "export async function getWarehouseIncomingMaterialsReportPdfSource(",
      forbidden: ["legacy:", "legacy_fallback", "fetchWarehouseIncomingMaterialsReportPdfSourceFallback", "apiFetchIncomingMaterialsReportFast"],
    },
    {
      key: "objectWorkRpcOnly",
      path: "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
      getterMarker: "export async function getWarehouseObjectWorkReportPdfSource(",
      forbidden: ["legacy:", "legacy_fallback", "fetchWarehouseObjectWorkReportPdfSourceFallback", "apiFetchIssuedByObjectReportFast"],
    },
  ];

  const boundary: Record<SourceBoundaryKey, boolean> = {
    incomingFormRpcOnly: false,
    dayMaterialsRpcOnly: false,
    incomingMaterialsRpcOnly: false,
    objectWorkRpcOnly: false,
  };
  const details: Record<SourceBoundaryKey, JsonRecord> = {
    incomingFormRpcOnly: {},
    dayMaterialsRpcOnly: {},
    incomingMaterialsRpcOnly: {},
    objectWorkRpcOnly: {},
  };

  for (const spec of specs) {
    const source = readSource(spec.path);
    const getterSource = extractBlock(source, spec.getterMarker);
    const noForbidden = spec.forbidden.every((token) => !source.includes(token) && !getterSource.includes(token));
    const rpcOnly =
      getterSource.includes("assertWarehousePdfRpcPrimary(") &&
      getterSource.includes("recordWarehousePdfRpcFailure(") &&
      getterSource.includes("fallbackUsed: false") &&
      noForbidden;

    boundary[spec.key] = rpcOnly;
    details[spec.key] = {
      path: spec.path,
      rpcOnly,
      noForbidden,
      hasPrimaryAssert: getterSource.includes("assertWarehousePdfRpcPrimary("),
      hasFailureRecord: getterSource.includes("recordWarehousePdfRpcFailure("),
      hasLifecycleObservation: getterSource.includes("beginPdfLifecycleObservation("),
      sourceKindExplicit: getterSource.includes('sourceKind: "rpc:'),
    };
  }

  return { boundary, details };
};

async function verifyIncomingForm(): Promise<CheckResult> {
  const head = await findLatestIncomingHead();
  if (!head) {
    return {
      name: "incomingForm",
      sampled: false,
      parityOk: false,
      details: { reason: "no_incoming_heads_found" },
    };
  }

  const incomingId = asText(head.incoming_id);
  const canonical = await fetchCanonicalIncomingForm(incomingId);
  const legacyLines = await fetchLegacyIncomingLines(incomingId);

  const canonicalSignatures = canonical.lines.map((row) => incomingLineSignature(row as UnknownRow));
  const legacySignatures = legacyLines.map((row) => incomingLineSignature(asRecord(row)));
  const parityOk = sameSignatureSet(canonicalSignatures, legacySignatures);

  return {
    name: "incomingForm",
    sampled: true,
    parityOk,
    details: {
      incomingId,
      canonicalSource: canonical.source,
      canonicalRows: canonical.lines.length,
      legacyRows: legacyLines.length,
      headerParityOk:
        asTextOrNull(canonical.incoming.incoming_id ?? canonical.incoming.id) === incomingId,
      lineParityOk: parityOk,
    },
  };
}

async function verifyIncomingMaterials(): Promise<CheckResult> {
  const head = await findLatestIncomingHead();
  if (!head || !asText(head.event_dt)) {
    return {
      name: "incomingMaterials",
      sampled: false,
      parityOk: false,
      details: { reason: "no_incoming_head_with_event_dt_found" },
    };
  }

  const range = toDayRange(asText(head.event_dt));
  const canonical = await fetchCanonicalIncomingMaterials(range);
  const legacyRows = await fetchLegacyIncomingMaterials(range);
  const incomingHeads = await findIncomingHeadsInRange(range);

  const canonicalSignatures = canonical.rows.map((row) =>
    incomingMaterialsSignature(row as UnknownRow),
  );
  const legacySignatures = legacyRows.map((row) =>
    incomingMaterialsSignature(asRecord(row)),
  );
  const docsTotalParityOk = canonical.docsTotal === incomingHeads.length;
  const rowParityOk = sameSignatureSet(canonicalSignatures, legacySignatures);

  return {
    name: "incomingMaterials",
    sampled: true,
    parityOk: docsTotalParityOk && rowParityOk,
    details: {
      range,
      canonicalSource: canonical.source,
      canonicalRows: canonical.rows.length,
      legacyRows: legacyRows.length,
      canonicalDocsTotal: canonical.docsTotal,
      expectedDocsTotal: incomingHeads.length,
      docsTotalParityOk,
      rowParityOk,
    },
  };
}

async function verifyDayMaterials(): Promise<CheckResult> {
  const issue = await findLatestIssueHead();
  if (!issue || !asText(issue.event_dt)) {
    return {
      name: "dayMaterials",
      sampled: false,
      parityOk: false,
      details: { reason: "no_issue_head_with_event_dt_found" },
    };
  }

  const range = toDayRange(asText(issue.event_dt));
  const canonical = await fetchCanonicalDayMaterials(range);
  const legacyRows = await fetchLegacyIssuedMaterials(range);
  const issueHeads = await findIssueHeadsInRange(range);

  const canonicalSignatures = canonical.rows.map((row) =>
    dayMaterialsSignature(row as UnknownRow),
  );
  const legacySignatures = legacyRows.map((row) =>
    dayMaterialsSignature(asRecord(row)),
  );
  const docsTotalParityOk = canonical.docsTotal === issueHeads.length;
  const rowParityOk = sameSignatureSet(canonicalSignatures, legacySignatures);

  return {
    name: "dayMaterials",
    sampled: true,
    parityOk: docsTotalParityOk && rowParityOk,
    details: {
      range,
      canonicalSource: canonical.source,
      canonicalRows: canonical.rows.length,
      legacyRows: legacyRows.length,
      canonicalDocsTotal: canonical.docsTotal,
      expectedDocsTotal: issueHeads.length,
      docsTotalParityOk,
      rowParityOk,
    },
  };
}

async function verifyObjectWork(): Promise<CheckResult> {
  const issue = await findLatestIssueHead();
  if (!issue || !asText(issue.event_dt)) {
    return {
      name: "objectWork",
      sampled: false,
      parityOk: false,
      details: { reason: "no_issue_head_with_event_dt_found" },
    };
  }

  const range = toDayRange(asText(issue.event_dt));
  const canonical = await fetchCanonicalObjectWork(range);
  const legacyRows = await fetchLegacyObjectWork(range);
  const issueHeads = await findIssueHeadsInRange(range);

  const canonicalSignatures = canonical.rows.map((row) =>
    objectWorkSignature(row as UnknownRow),
  );
  const legacySignatures = legacyRows.map((row) =>
    objectWorkSignature(asRecord(row)),
  );
  const docsTotalParityOk = canonical.docsTotal === issueHeads.length;
  const rowParityOk = sameSignatureSet(canonicalSignatures, legacySignatures);

  return {
    name: "objectWork",
    sampled: true,
    parityOk: docsTotalParityOk && rowParityOk,
    details: {
      range,
      canonicalSource: canonical.source,
      canonicalRows: canonical.rows.length,
      legacyRows: legacyRows.length,
      canonicalDocsTotal: canonical.docsTotal,
      expectedDocsTotal: issueHeads.length,
      docsTotalParityOk,
      rowParityOk,
    },
  };
}

async function main() {
  const { boundary, details } = inspectSourceBoundary();

  const checks = [
    await verifyIncomingForm(),
    await verifyIncomingMaterials(),
    await verifyDayMaterials(),
    await verifyObjectWork(),
  ];

  const parityPassedCount = checks.filter((item) => item.parityOk).length;
  const parityFailedCount = checks.length - parityPassedCount;
  const liveRpcSamplesOk = checks.every((item) => item.sampled);

  const gate =
    Object.values(boundary).every(Boolean) &&
    liveRpcSamplesOk &&
    parityFailedCount === 0
      ? "GREEN"
      : "NOT_GREEN";

  const summary = {
    status: gate === "GREEN" ? "passed" : "failed",
    gate,
    primaryOwner: "rpc_v1",
    fallbackUsed: false,
    sourceBoundary: boundary,
    assertions: {
      no_pdf_fallback: Object.values(boundary).every(Boolean),
      warehousePdfRpcOnly: Object.values(boundary).every(Boolean),
      liveRpcSamplesOk,
      legacyParityOk: parityFailedCount === 0,
    },
    parityPassedCount,
    parityFailedCount,
    sampledChecks: checks.map((item) => item.name),
  };

  writeJson(`${artifactBase}.json`, {
    summary,
    sourceBoundary: details,
    checks,
  });
  writeJson(`${artifactBase}.summary.json`, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (gate !== "GREEN") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
