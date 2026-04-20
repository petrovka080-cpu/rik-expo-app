/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createCanonicalPdfErrorResponse,
  createCanonicalPdfOptionsResponse,
  createCanonicalPdfSuccessResponse,
} from "../../../src/lib/pdf/canonicalPdfPlatformContract.ts";
import { resolveWarehousePdfAccess } from "../../../src/lib/pdf/rolePdfAuth.ts";
import {
  buildWarehouseIncomingRegisterManifestContract,
  normalizeWarehousePdfRequest,
  type WarehousePdfRequest,
} from "../../../src/lib/pdf/warehousePdf.shared.ts";
import {
  buildCanonicalPdfFileName,
  buildStoragePath,
  cleanText,
  normalizePdfFileName,
  renderPdfBytes,
  resolveSignedUrlTtlSeconds,
  uploadCanonicalPdf,
} from "../_shared/canonicalPdf.ts";
import {
  buildWarehouseIncomingFormHtml,
  buildWarehouseIncomingMaterialsReportHtml,
  buildWarehouseIncomingRegisterHtml,
  buildWarehouseIssueFormHtml,
  buildWarehouseIssuesRegisterHtml,
  buildWarehouseMaterialsReportHtml,
  buildWarehouseObjectWorkReportHtml,
  formatRuDayLabel,
} from "../_shared/warehousePdfHtml.ts";

const FUNCTION_NAME = "warehouse-pdf";
const DEFAULT_BUCKET = "role_pdf_exports";
const RENDER_BRANCH = "backend_warehouse_pdf_v1";
const INCOMING_REGISTER_ARTIFACT_CACHE_VERSION = "pdf_z3_warehouse_incoming_register_artifact_v1";
const ALL_FROM_ISO = "1970-01-01T00:00:00.000Z";
const ALL_TO_ISO = "2100-01-01T00:00:00.000Z";
const RU_MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item) => Boolean(asRecord(item))).map((item) => asRecord(item) as Record<string, unknown>)
    : [];

const toNumber = (value: unknown) => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value).trim().replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeIssueHead = (value: unknown) => {
  const row = asRecord(value);
  const issueId = cleanText(row?.issue_id);
  if (!issueId) return null;
  return {
    issue_id: issueId,
    issue_no: cleanText(row?.issue_no) || null,
    base_no: cleanText(row?.base_no) || null,
    event_dt: cleanText(row?.event_dt) || null,
    kind: cleanText(row?.kind) || null,
    who: cleanText(row?.who) || null,
    note: cleanText(row?.note) || null,
    request_id: cleanText(row?.request_id) || null,
    display_no: cleanText(row?.display_no) || null,
    qty_total: row?.qty_total ?? null,
    qty_in_req: row?.qty_in_req ?? null,
    qty_over: row?.qty_over ?? null,
    object_name: cleanText(row?.object_name) || null,
    work_name: cleanText(row?.work_name) || null,
  };
};

const normalizeIssueLine = (value: unknown) => {
  const row = asRecord(value);
  const issueId = cleanText(row?.issue_id);
  if (!issueId) return null;
  return {
    issue_id: issueId,
    rik_code: cleanText(row?.rik_code) || null,
    uom: cleanText(row?.uom) || null,
    name_human: cleanText(row?.name_human) || null,
    qty_total: row?.qty_total ?? null,
    qty_in_req: row?.qty_in_req ?? null,
    qty_over: row?.qty_over ?? null,
    uom_id: cleanText(row?.uom_id) || null,
    item_name_ru: cleanText(row?.item_name_ru) || null,
    item_name: cleanText(row?.item_name) || null,
    name: cleanText(row?.name) || null,
    title: cleanText(row?.title) || null,
  };
};

const normalizeIncomingHead = (value: unknown) => {
  const row = asRecord(value);
  const incomingId = cleanText(row?.incoming_id ?? row?.id);
  if (!incomingId) return null;
  return {
    incoming_id: incomingId,
    display_no: cleanText(row?.display_no) || null,
    event_dt: cleanText(row?.event_dt) || null,
    who: cleanText(row?.who) || cleanText(row?.warehouseman_fio) || null,
    warehouseman_fio: cleanText(row?.warehouseman_fio) || null,
    note: cleanText(row?.note) || null,
    qty_total: row?.qty_total ?? row?.sum_total ?? null,
  };
};

const normalizeIncomingLine = (value: unknown) => {
  const row = asRecord(value);
  const code = cleanText(row?.code);
  const rawName =
    cleanText(row?.name_ru) ||
    cleanText(row?.material_name) ||
    cleanText(row?.name) ||
    code;
  return {
    purchase_item_id: cleanText(row?.purchase_item_id) || null,
    name_ru: rawName || null,
    name: rawName || null,
    material_name: rawName || null,
    code: code || null,
    uom_id: cleanText(row?.uom_id) || null,
    uom: cleanText(row?.uom) || cleanText(row?.uom_id) || null,
    qty_received: row?.qty_received ?? row?.qty ?? 0,
    qty: row?.qty ?? row?.qty_received ?? 0,
  };
};

function parseRuDayLabel(dayLabel: string) {
  const source = cleanText(dayLabel).toLowerCase().replace(/\s+/g, " ").replace(" г.", "").replace(" г", "").trim();
  const parts = source.split(" ");
  if (parts.length < 3) {
    throw new Error(`Cannot parse day label: ${dayLabel}`);
  }
  const dd = Number(parts[0]);
  const mm = RU_MONTHS[parts[1]];
  const yy = Number(parts[2]);
  if (!Number.isFinite(dd) || mm == null || !Number.isFinite(yy)) {
    throw new Error(`Cannot parse day label: ${dayLabel}`);
  }
  return new Date(yy, mm, dd);
}

function buildRpcRange(payload: WarehousePdfRequest) {
  if ("dayLabel" in payload && cleanText(payload.dayLabel)) {
    const dayDate = parseRuDayLabel(payload.dayLabel as string);
    const from = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
    const to = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    return {
      periodFrom: cleanText(payload.dayLabel),
      periodTo: cleanText(payload.dayLabel),
      rpcFrom: from.toISOString(),
      rpcTo: to.toISOString(),
    };
  }

  const periodFrom = "periodFrom" in payload ? cleanText(payload.periodFrom) : "";
  const periodTo = "periodTo" in payload ? cleanText(payload.periodTo) : "";
  return {
    periodFrom: periodFrom || "",
    periodTo: periodTo || "",
    rpcFrom: periodFrom || ALL_FROM_ISO,
    rpcTo: periodTo || ALL_TO_ISO,
  };
}

function filterHeadsByDayLabel(rows: Record<string, unknown>[], dayLabel?: string | null) {
  const wanted = cleanText(dayLabel);
  if (!wanted) return rows;
  return rows.filter((row) => {
    const date = cleanText(row.event_dt) ? new Date(cleanText(row.event_dt)) : null;
    return date && !Number.isNaN(date.getTime()) && formatRuDayLabel(date) === wanted;
  });
}

async function requireWarehouseAuth(
  request: Request,
  supabaseUrl: string,
  context?: { documentKind?: string | null },
) {
  const anonKey = cleanText(Deno.env.get("SUPABASE_ANON_KEY"));
  const authHeader = cleanText(request.headers.get("Authorization"));

  if (!anonKey || !authHeader) {
    throw createCanonicalPdfErrorResponse({
      status: 401,
      role: "warehouse",
      documentType: "warehouse_document",
      errorCode: "auth_failed",
      error: "Unauthorized.",
    });
  }

  const requester = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    },
  });

  const { data: userData, error: userError } = await requester.auth.getUser();

  if (userError || !userData?.user) {
    throw createCanonicalPdfErrorResponse({
      status: 401,
      role: "warehouse",
      documentType: "warehouse_document",
      errorCode: "auth_failed",
      error: "Unauthorized.",
    });
  }

  const requesterUserId = userData.user.id;
  const membershipResult = await requester
    .from("company_members")
    .select("role, company_id")
    .eq("user_id", requesterUserId);

  const decision = resolveWarehousePdfAccess({
    membershipRows: membershipResult.data,
  });

  if (!decision.allowed) {
    console.log(
      `[${FUNCTION_NAME}] warehouse membership forbidden ${JSON.stringify({
        rejectionReason: decision.reason,
        documentKind: context?.documentKind ?? null,
        uid: requesterUserId,
        email: cleanText(userData.user.email),
        companyMemberRoles: decision.membershipRoles,
        companyMemberIds: decision.membershipCompanyIds,
        membershipError: membershipResult.error?.message ?? null,
      })}`,
    );
    throw createCanonicalPdfErrorResponse({
      status: 403,
      role: "warehouse",
      documentType: "warehouse_document",
      errorCode: "auth_failed",
      error: "Forbidden.",
    });
  }

  return {
    userId: requesterUserId,
    requester,
  };
}

async function loadIssueHeads(admin: any, rpcFrom: string | null, rpcTo: string | null) {
  const { data, error } = await admin.rpc("acc_report_issues_v2", {
    p_from: rpcFrom,
    p_to: rpcTo,
  });
  if (error) {
    throw new Error(`acc_report_issues_v2 failed: ${error.message}`);
  }
  return asArray(data).map(normalizeIssueHead).filter(Boolean);
}

async function loadIssueLines(admin: any, issueId: number) {
  const { data, error } = await admin.rpc("acc_report_issue_lines", {
    p_issue_id: issueId,
  });
  if (error) {
    throw new Error(`acc_report_issue_lines failed: ${error.message}`);
  }
  return asArray(data).map(normalizeIssueLine).filter(Boolean);
}

async function loadIncomingHeads(admin: any, rpcFrom: string | null, rpcTo: string | null) {
  const { data, error } = await admin.rpc("acc_report_incoming_v2", {
    p_from: rpcFrom,
    p_to: rpcTo,
  });
  if (error) {
    throw new Error(`acc_report_incoming_v2 failed: ${error.message}`);
  }
  return asArray(data).map(normalizeIncomingHead).filter(Boolean);
}

async function loadIncomingFormSource(admin: any, incomingId: string) {
  const { data, error } = await admin.rpc("pdf_warehouse_incoming_source_v1", {
    p_incoming_id: incomingId,
  });
  if (error) {
    throw new Error(`pdf_warehouse_incoming_source_v1 failed: ${error.message}`);
  }
  const root = asRecord(data);
  const header = asRecord(root?.header);
  const rows = asArray(root?.rows).map(normalizeIncomingLine);
  if (!header || rows.length === 0) {
    throw new Error("pdf_warehouse_incoming_source_v1 returned invalid payload");
  }
  return {
    incoming: normalizeIncomingHead({
      ...header,
      incoming_id: cleanText(header.incoming_id) || incomingId,
    }),
    lines: rows,
  };
}

async function loadIncomingMaterialsSource(admin: any, rpcFrom: string, rpcTo: string) {
  const { data, error } = await admin.rpc("pdf_warehouse_incoming_materials_source_v1", {
    p_from: rpcFrom,
    p_to: rpcTo,
  });
  if (error) {
    throw new Error(`pdf_warehouse_incoming_materials_source_v1 failed: ${error.message}`);
  }
  const root = asRecord(data);
  return {
    rows: asArray(root?.rows).map((row) => ({
      material_code: cleanText(row.material_code) || null,
      material_name: cleanText(row.material_name) || cleanText(row.material_code) || null,
      uom: cleanText(row.uom) || null,
      sum_total: row.sum_total ?? 0,
    })),
    docsTotal: Math.max(0, Math.round(toNumber(asRecord(root?.totals)?.docs_total))),
  };
}

async function loadDayMaterialsSource(admin: any, rpcFrom: string, rpcTo: string) {
  const { data, error } = await admin.rpc("pdf_warehouse_day_materials_source_v1", {
    p_from: rpcFrom,
    p_to: rpcTo,
  });
  if (error) {
    throw new Error(`pdf_warehouse_day_materials_source_v1 failed: ${error.message}`);
  }
  const root = asRecord(data);
  return {
    rows: asArray(root?.rows).map((row) => ({
      material_code: cleanText(row.material_code) || null,
      material_name: cleanText(row.material_name) || cleanText(row.material_code) || null,
      uom: cleanText(row.uom) || null,
      sum_in_req: row.sum_in_req ?? 0,
      sum_free: row.sum_free ?? 0,
      sum_total: row.sum_total ?? 0,
    })),
    docsTotal: Math.max(0, Math.round(toNumber(asRecord(root?.totals)?.docs_total))),
  };
}

async function loadObjectWorkSource(admin: any, rpcFrom: string, rpcTo: string, objectId?: string | null) {
  const { data, error } = await admin.rpc("pdf_warehouse_object_work_source_v1", {
    p_from: rpcFrom,
    p_to: rpcTo,
    p_object_id: cleanText(objectId) || null,
  });
  if (error) {
    throw new Error(`pdf_warehouse_object_work_source_v1 failed: ${error.message}`);
  }
  const root = asRecord(data);
  return {
    rows: asArray(root?.rows).map((row) => ({
      object_id: cleanText(row.object_id) || null,
      object_name: cleanText(row.object_name) || "Без объекта",
      work_name: cleanText(row.work_name) || "Без вида работ",
      docs_cnt: row.docs_cnt ?? 0,
      req_cnt: row.req_cnt ?? 0,
      active_days: row.active_days ?? 0,
      uniq_materials: row.uniq_materials ?? 0,
      recipients_text: cleanText(row.recipients_text) || null,
      top3_materials: cleanText(row.top3_materials) || null,
    })),
    docsTotal: Math.max(0, Math.round(toNumber(asRecord(root?.totals)?.docs_total))),
  };
}

async function loadIssuedMaterialsFast(admin: any, rpcFrom: string, rpcTo: string, objectId?: string | null) {
  const { data, error } = await admin.rpc("wh_report_issued_materials_fast", {
    p_from: rpcFrom,
    p_to: rpcTo,
    p_object_id: cleanText(objectId) || null,
  });
  if (error) {
    throw new Error(`wh_report_issued_materials_fast failed: ${error.message}`);
  }
  return asArray(data).map((row) => ({
    material_code: cleanText(row.material_code) || null,
    material_name: cleanText(row.material_name) || cleanText(row.material_code) || null,
    uom: cleanText(row.uom) || null,
    sum_in_req: row.sum_in_req ?? 0,
    sum_free: row.sum_free ?? 0,
    sum_total: row.sum_total ?? 0,
  }));
}

function buildWarehouseFileName(payload: WarehousePdfRequest) {
  const suffix =
    "issueId" in payload
      ? String(payload.issueId)
      : "incomingId" in payload
        ? payload.incomingId
        : cleanText("dayLabel" in payload ? payload.dayLabel : "") ||
          [cleanText("periodFrom" in payload ? payload.periodFrom : ""), cleanText("periodTo" in payload ? payload.periodTo : "")]
            .filter(Boolean)
            .join("_") ||
          "all";

  return normalizePdfFileName(
    buildCanonicalPdfFileName({
      documentType: payload.documentType,
      title: payload.documentKind,
      entityId: suffix,
    }),
    payload.documentType,
  );
}

async function trySignExistingPdfArtifact(args: {
  admin: any;
  bucketId: string;
  storagePath: string;
}) {
  const slashIndex = args.storagePath.lastIndexOf("/");
  const prefix = slashIndex >= 0 ? args.storagePath.slice(0, slashIndex) : "";
  const objectName = slashIndex >= 0 ? args.storagePath.slice(slashIndex + 1) : args.storagePath;
  const listed = await args.admin.storage.from(args.bucketId).list(prefix, {
    limit: 1,
    search: objectName,
  });
  if (listed.error || !Array.isArray(listed.data)) return null;
  const exists = listed.data.some((item: Record<string, unknown>) => cleanText(item?.name) === objectName);
  if (!exists) return null;

  const ttlSeconds = resolveSignedUrlTtlSeconds();
  const signed = await args.admin.storage.from(args.bucketId).createSignedUrl(args.storagePath, ttlSeconds);
  const signedUrl = cleanText(signed.data?.signedUrl);
  if (signed.error || !signedUrl) return null;
  return {
    bucketId: args.bucketId,
    storagePath: args.storagePath,
    signedUrl,
    expiresInSeconds: ttlSeconds,
  };
}

function isStorageAlreadyExistsError(error: unknown) {
  const message = cleanText((error as { message?: unknown } | null)?.message).toLowerCase();
  const status = cleanText((error as { statusCode?: unknown } | null)?.statusCode);
  return status === "409" || message.includes("already exists") || message.includes("duplicate");
}

async function uploadWarehousePdfArtifact(args: {
  admin: any;
  bucketId: string;
  storagePath: string;
  bytes: Uint8Array;
}) {
  try {
    const uploaded = await uploadCanonicalPdf({
      admin: args.admin,
      bucketId: args.bucketId,
      storagePath: args.storagePath,
      bytes: args.bytes,
      ttlSeconds: resolveSignedUrlTtlSeconds(),
    });
    return {
      bucketId: args.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
    };
  } catch (error) {
    if (isStorageAlreadyExistsError(error)) {
      const existing = await trySignExistingPdfArtifact({
        admin: args.admin,
        bucketId: args.bucketId,
        storagePath: args.storagePath,
      });
      if (existing) return existing;
    }
    throw error;
  }
}

async function renderIncomingRegisterWithArtifactCache(args: {
  admin: any;
  bucketId: string;
  payload: Extract<WarehousePdfRequest, { documentKind: "incoming_register" }>;
  requestedByUserId: string;
}) {
  const totalStartedAt = Date.now();
  const range = buildRpcRange(args.payload);
  const sourceStartedAt = Date.now();
  const heads = await loadIncomingHeads(args.admin, range.rpcFrom, range.rpcTo);
  const filtered = filterHeadsByDayLabel(heads, args.payload.dayLabel);
  const sourceLoadedAt = Date.now();
  const companyName = cleanText(args.payload.companyName) || "";
  const warehouseName = cleanText(args.payload.warehouseName) || "";
  const fileName = buildWarehouseFileName(args.payload);
  const artifact = await buildWarehouseIncomingRegisterManifestContract({
    periodFrom: args.payload.periodFrom,
    periodTo: args.payload.periodTo,
    companyName,
    warehouseName,
    incomingHeads: filtered,
    fileName,
  });

  const cachedArtifact = await trySignExistingPdfArtifact({
    admin: args.admin,
    bucketId: args.bucketId,
    storagePath: artifact.artifactPath,
  });
  if (cachedArtifact) {
    console.info(`[${FUNCTION_NAME}] backend_incoming_register_artifact_hit`, {
      periodFrom: range.periodFrom,
      periodTo: range.periodTo,
      bucketId: cachedArtifact.bucketId,
      storagePath: cachedArtifact.storagePath,
      sourceVersion: artifact.sourceVersion,
      artifactVersion: artifact.artifactVersion,
      sourceMs: sourceLoadedAt - sourceStartedAt,
      totalMs: Date.now() - totalStartedAt,
    });
    return createCanonicalPdfSuccessResponse({
      role: "warehouse",
      documentType: args.payload.documentType,
      bucketId: cachedArtifact.bucketId,
      storagePath: cachedArtifact.storagePath,
      signedUrl: cachedArtifact.signedUrl,
      fileName,
      generatedAt: new Date().toISOString(),
      renderBranch: RENDER_BRANCH,
      renderer: "artifact_cache",
      telemetry: {
        functionName: FUNCTION_NAME,
        documentKind: args.payload.documentKind,
        requestedByUserId: args.requestedByUserId,
        periodFrom: range.periodFrom,
        periodTo: range.periodTo,
        dayLabel: null,
        cacheStatus: "artifact_hit",
        cacheVersion: INCOMING_REGISTER_ARTIFACT_CACHE_VERSION,
        templateVersion: artifact.templateVersion,
        sourceVersion: artifact.sourceVersion,
        artifactVersion: artifact.artifactVersion,
        sourceMs: sourceLoadedAt - sourceStartedAt,
        renderMs: 0,
        uploadAndSignMs: 0,
        totalMs: Date.now() - totalStartedAt,
      },
    });
  }

  const html = buildWarehouseIncomingRegisterHtml({
    periodFrom: range.periodFrom,
    periodTo: range.periodTo,
    items: filtered,
    orgName: companyName,
    warehouseName,
  });
  const renderStartedAt = Date.now();
  const { pdfBytes, renderer } = await renderPdfBytes(html);
  const renderFinishedAt = Date.now();
  const uploadStartedAt = Date.now();
  const uploaded = await uploadWarehousePdfArtifact({
    admin: args.admin,
    bucketId: args.bucketId,
    storagePath: artifact.artifactPath,
    bytes: pdfBytes,
  });
  const uploadFinishedAt = Date.now();

  console.info(`[${FUNCTION_NAME}] backend_incoming_register_artifact_miss`, {
    periodFrom: range.periodFrom,
    periodTo: range.periodTo,
    bucketId: uploaded.bucketId,
    storagePath: uploaded.storagePath,
    sourceVersion: artifact.sourceVersion,
    artifactVersion: artifact.artifactVersion,
    sourceMs: sourceLoadedAt - sourceStartedAt,
    renderMs: renderFinishedAt - renderStartedAt,
    uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
    totalMs: uploadFinishedAt - totalStartedAt,
  });

  return createCanonicalPdfSuccessResponse({
    role: "warehouse",
    documentType: args.payload.documentType,
    bucketId: uploaded.bucketId,
    storagePath: uploaded.storagePath,
    signedUrl: uploaded.signedUrl,
    fileName,
    generatedAt: new Date().toISOString(),
    renderBranch: RENDER_BRANCH,
    renderer,
    telemetry: {
      functionName: FUNCTION_NAME,
      documentKind: args.payload.documentKind,
      requestedByUserId: args.requestedByUserId,
      periodFrom: range.periodFrom,
      periodTo: range.periodTo,
      dayLabel: null,
      cacheStatus: "artifact_miss",
      cacheVersion: INCOMING_REGISTER_ARTIFACT_CACHE_VERSION,
      templateVersion: artifact.templateVersion,
      sourceVersion: artifact.sourceVersion,
      artifactVersion: artifact.artifactVersion,
      sourceMs: sourceLoadedAt - sourceStartedAt,
      renderMs: renderFinishedAt - renderStartedAt,
      uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
      totalMs: uploadFinishedAt - totalStartedAt,
      htmlLength: html.length,
      pdfSizeBytes: pdfBytes.byteLength,
    },
  });
}

async function assertWarehouseRequesterRpcOk(args: {
  requester: any;
  rpcName: string;
  rpcArgs: Record<string, unknown>;
}) {
  const { data, error } = await args.requester.rpc(args.rpcName, args.rpcArgs);
  if (error) {
    console.log(
      `[${FUNCTION_NAME}] warehouse rpc access forbidden ${JSON.stringify({
        rpcName: args.rpcName,
        rpcArgs: args.rpcArgs,
        error: error?.message ?? null,
        code: (error as { code?: string })?.code ?? null,
      })}`,
    );
    throw buildErrorResponse(403, "warehouse_document", "Forbidden.");
  }
  return data;
}

async function assertWarehouseSourceAccess(args: {
  requester: any;
  payload: WarehousePdfRequest;
}) {
  const { requester, payload } = args;
  const range = buildRpcRange(payload);

  switch (payload.documentKind) {
    case "issue_form": {
      const data = await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "acc_report_issues_v2",
        rpcArgs: { p_from: null, p_to: null },
      });
      const visible = asArray(data)
        .map(normalizeIssueHead)
        .filter(Boolean)
        .some((row) => Number(row.issue_id) === Number(payload.issueId));
      if (!visible) {
        console.log(
          `[${FUNCTION_NAME}] warehouse issue not visible ${JSON.stringify({
            issueId: payload.issueId,
            documentKind: payload.documentKind,
          })}`,
        );
        throw buildErrorResponse(403, payload.documentType, "Forbidden.");
      }
      return;
    }
    case "incoming_form": {
      const data = await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "pdf_warehouse_incoming_source_v1",
        rpcArgs: { p_incoming_id: payload.incomingId },
      });
      const header = asRecord(asRecord(data).header);
      const incomingId = cleanText(header.incoming_id ?? header.id);
      if (!incomingId) {
        console.log(
          `[${FUNCTION_NAME}] warehouse incoming not visible ${JSON.stringify({
            incomingId: payload.incomingId,
            documentKind: payload.documentKind,
          })}`,
        );
        throw buildErrorResponse(403, payload.documentType, "Forbidden.");
      }
      return;
    }
    case "issue_register":
    case "issue_day_register":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "acc_report_issues_v2",
        rpcArgs: { p_from: range.rpcFrom, p_to: range.rpcTo },
      });
      return;
    case "incoming_register":
    case "incoming_day_register":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "acc_report_incoming_v2",
        rpcArgs: { p_from: range.rpcFrom, p_to: range.rpcTo },
      });
      return;
    case "issue_materials":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "wh_report_issued_materials_fast",
        rpcArgs: {
          p_from: range.rpcFrom,
          p_to: range.rpcTo,
          p_object_id: cleanText(payload.objectId) || null,
        },
      });
      return;
    case "issue_day_materials":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "pdf_warehouse_day_materials_source_v1",
        rpcArgs: { p_from: range.rpcFrom, p_to: range.rpcTo },
      });
      return;
    case "incoming_materials":
    case "incoming_day_materials":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "pdf_warehouse_incoming_materials_source_v1",
        rpcArgs: { p_from: range.rpcFrom, p_to: range.rpcTo },
      });
      return;
    case "object_work":
      await assertWarehouseRequesterRpcOk({
        requester,
        rpcName: "pdf_warehouse_object_work_source_v1",
        rpcArgs: {
          p_from: range.rpcFrom,
          p_to: range.rpcTo,
          p_object_id: cleanText(payload.objectId) || null,
        },
      });
      return;
    default:
      console.log(
        `[${FUNCTION_NAME}] warehouse document kind forbidden ${JSON.stringify({
          documentKind: payload.documentKind,
        })}`,
      );
      throw buildErrorResponse(403, payload.documentType, "Forbidden.");
  }
}

async function buildWarehousePdfModel(admin: any, payload: WarehousePdfRequest) {
  const fileName = buildWarehouseFileName(payload);
  const range = buildRpcRange(payload);
  const companyName = cleanText(payload.companyName) || "";
  const warehouseName = cleanText(payload.warehouseName) || "";

  switch (payload.documentKind) {
    case "issue_form": {
      const heads = await loadIssueHeads(admin, null, null);
      const head = heads.find((row) => Number(row.issue_id) === Number(payload.issueId));
      if (!head) {
        throw new Error("Warehouse issue document not found");
      }
      const lines = await loadIssueLines(admin, payload.issueId);
      return {
        html: buildWarehouseIssueFormHtml({
          head,
          lines,
          orgName: companyName,
          warehouseName,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          issueId: payload.issueId,
        },
      };
    }
    case "incoming_form": {
      const source = await loadIncomingFormSource(admin, payload.incomingId);
      return {
        html: buildWarehouseIncomingFormHtml({
          incoming: source.incoming,
          lines: source.lines,
          orgName: companyName,
          warehouseName,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          incomingId: payload.incomingId,
        },
      };
    }
    case "issue_register":
    case "issue_day_register": {
      const heads = await loadIssueHeads(admin, range.rpcFrom, range.rpcTo);
      const filtered = filterHeadsByDayLabel(heads, payload.dayLabel);
      return {
        html: buildWarehouseIssuesRegisterHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          issues: filtered,
          orgName: companyName,
          warehouseName,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          dayLabel: cleanText(payload.dayLabel) || null,
        },
      };
    }
    case "incoming_register":
    case "incoming_day_register": {
      const heads = await loadIncomingHeads(admin, range.rpcFrom, range.rpcTo);
      const filtered = filterHeadsByDayLabel(heads, payload.dayLabel);
      return {
        html: buildWarehouseIncomingRegisterHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          items: filtered,
          orgName: companyName,
          warehouseName,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          dayLabel: cleanText(payload.dayLabel) || null,
        },
      };
    }
    case "issue_materials": {
      const heads = await loadIssueHeads(admin, range.rpcFrom, range.rpcTo);
      const rows = await loadIssuedMaterialsFast(admin, range.rpcFrom, range.rpcTo, cleanText(payload.objectId) || null);
      const docsByReq = heads.filter((row) => cleanText(row.kind).toUpperCase() === "REQ").length;
      const docsWithoutReq = Math.max(0, heads.length - docsByReq);
      return {
        html: buildWarehouseMaterialsReportHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          orgName: companyName,
          warehouseName,
          objectName: cleanText(payload.objectName) || null,
          workName: null,
          rows,
          docsTotal: heads.length,
          docsByReq,
          docsWithoutReq,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          objectId: cleanText(payload.objectId) || null,
        },
      };
    }
    case "issue_day_materials": {
      const source = await loadDayMaterialsSource(admin, range.rpcFrom, range.rpcTo);
      return {
        html: buildWarehouseMaterialsReportHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          orgName: companyName,
          warehouseName,
          objectName: null,
          workName: null,
          rows: source.rows,
          docsTotal: source.docsTotal,
          docsByReq: source.docsTotal,
          docsWithoutReq: 0,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          dayLabel: cleanText(payload.dayLabel) || null,
        },
      };
    }
    case "incoming_materials":
    case "incoming_day_materials": {
      const source = await loadIncomingMaterialsSource(admin, range.rpcFrom, range.rpcTo);
      return {
        html: buildWarehouseIncomingMaterialsReportHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          orgName: companyName,
          warehouseName,
          rows: source.rows,
          docsTotal: source.docsTotal,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          dayLabel: cleanText(payload.dayLabel) || null,
        },
      };
    }
    case "object_work": {
      const source = await loadObjectWorkSource(admin, range.rpcFrom, range.rpcTo, payload.objectId);
      return {
        html: buildWarehouseObjectWorkReportHtml({
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          orgName: companyName,
          warehouseName,
          objectName: cleanText(payload.objectName) || null,
          rows: source.rows,
          docsTotal: source.docsTotal,
        }),
        fileName,
        telemetry: {
          documentKind: payload.documentKind,
          periodFrom: range.periodFrom,
          periodTo: range.periodTo,
          objectId: cleanText(payload.objectId) || null,
        },
      };
    }
    default:
      throw new Error(`Unsupported warehouse PDF documentKind: ${payload.documentKind}`);
  }
}

function buildErrorResponse(status: number, documentType: WarehousePdfRequest["documentType"], error: string) {
  return createCanonicalPdfErrorResponse({
    status,
    role: "warehouse",
    documentType,
    errorCode:
      status === 401 || status === 403
        ? "auth_failed"
        : status >= 500
          ? "backend_pdf_failed"
          : "validation_failed",
    error,
    renderBranch: status >= 500 ? RENDER_BRANCH : undefined,
  });
}

const serverPort = Number(Deno.env.get("PORT") ?? "8000");

Deno.serve({ port: Number.isFinite(serverPort) ? serverPort : 8000 }, async (request) => {
  if (request.method === "OPTIONS") {
    return createCanonicalPdfOptionsResponse();
  }

  if (request.method !== "POST") {
    return buildErrorResponse(405, "warehouse_document", "Method not allowed.");
  }

  const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const bucketId = cleanText(Deno.env.get("CANONICAL_PDF_EXPORTS_BUCKET")) || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) {
    return buildErrorResponse(500, "warehouse_document", "Missing Supabase environment.");
  }

  let payload: WarehousePdfRequest;
  try {
    payload = normalizeWarehousePdfRequest(await request.json());
  } catch (error) {
    return buildErrorResponse(
      400,
      "warehouse_document",
      error instanceof Error ? error.message : "Warehouse PDF payload is invalid.",
    );
  }

  try {
    const auth = await requireWarehouseAuth(request, supabaseUrl, {
      documentKind: payload.documentKind,
    });
    await assertWarehouseSourceAccess({
      requester: auth.requester,
      payload,
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (payload.documentKind === "incoming_register") {
      return await renderIncomingRegisterWithArtifactCache({
        admin,
        bucketId,
        payload,
        requestedByUserId: auth.userId,
      });
    }

    const model = await buildWarehousePdfModel(admin, payload);
    const { pdfBytes, renderer } = await renderPdfBytes(model.html);
    const storagePath = buildStoragePath(`warehouse/${payload.documentKind}`, model.fileName);
    const uploaded = await uploadCanonicalPdf({
      admin,
      bucketId,
      storagePath,
      bytes: pdfBytes,
      ttlSeconds: resolveSignedUrlTtlSeconds(),
    });

    return createCanonicalPdfSuccessResponse({
      role: "warehouse",
      documentType: payload.documentType,
      bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName: model.fileName,
      generatedAt: new Date().toISOString(),
      renderBranch: RENDER_BRANCH,
      renderer,
      telemetry: {
        functionName: FUNCTION_NAME,
        documentKind: payload.documentKind,
        requestedByUserId: auth.userId,
        ...model.telemetry,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(`[${FUNCTION_NAME}]`, error instanceof Error ? error.message : String(error));
    return buildErrorResponse(
      500,
      payload.documentType,
      error instanceof Error ? error.message : "Warehouse PDF render failed.",
    );
  }
});
