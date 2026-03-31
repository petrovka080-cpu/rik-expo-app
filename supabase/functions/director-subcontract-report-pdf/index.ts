/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderDirectorSubcontractReportPdfHtml } from "../../../src/lib/pdf/pdf.director.templates.ts";
import {
  normalizeDirectorSubcontractReportPdfRequest,
  prepareDirectorSubcontractReportPdfModelShared,
} from "../../../src/lib/pdf/directorSubcontractReport.shared.ts";
import { resolveDirectorPdfRoleAccess } from "../../../src/lib/pdf/directorPdfAuth.ts";
import {
  createDirectorPdfErrorResponse,
  createDirectorPdfOptionsResponse,
  createDirectorPdfSuccessResponse,
} from "../../../src/lib/pdf/directorPdfPlatformContract.ts";

const FUNCTION_NAME = "director-subcontract-report-pdf";
const DEFAULT_BUCKET = "director_pdf_exports";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const WINDOWS_LOCAL_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const UNIX_LOCAL_BROWSER_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

type SubcontractSourceEnvelope = {
  document_type?: string;
  version?: string;
  rows?: unknown[];
};

function json(status: number, body: Record<string, unknown>) {
  return createDirectorPdfErrorResponse({
    status,
    errorCode: status === 401 || status === 403 ? "auth_failed" : status >= 500 ? "backend_pdf_failed" : "validation_failed",
    error: String(body.error ?? "Director subcontract report PDF render failed."),
    documentKind: "subcontract_report",
    renderBranch: status >= 500 ? "backend_subcontract_report_v1" : undefined,
  });
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function sanitizeStem(value: string) {
  return (
    cleanText(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "director_subcontract_report"
  );
}

function normalizePdfFileName(stem: string) {
  const normalized = sanitizeStem(stem.replace(/\.pdf$/i, ""));
  return `${normalized}.pdf`;
}

function buildStoragePath(fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const nonce = crypto.randomUUID().slice(0, 8);
  return `director/subcontract_report/${yyyy}/${mm}/${dd}/${stamp}_${nonce}_${fileName}`;
}

function resolveSignedUrlTtlSeconds() {
  const raw = Number(Deno.env.get("DIRECTOR_PDF_RENDER_SIGNED_URL_TTL_SECONDS") ?? NaN);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SIGNED_URL_TTL_SECONDS;
  return Math.floor(raw);
}

function resolveBrowserWsEndpoint() {
  const explicit = cleanText(Deno.env.get("DIRECTOR_PDF_BROWSERLESS_WS_ENDPOINT"));
  if (explicit) return explicit;

  const browserlessToken = cleanText(Deno.env.get("PUPPETEER_BROWSERLESS_IO_KEY"));
  if (browserlessToken) {
    return `wss://chrome.browserless.io?token=${encodeURIComponent(browserlessToken)}`;
  }

  return "";
}

function resolveBrowserUrl() {
  return cleanText(Deno.env.get("DIRECTOR_PDF_BROWSER_URL"));
}

async function resolveLocalBrowserExecutable() {
  const explicit = cleanText(
    Deno.env.get("DIRECTOR_PDF_LOCAL_BROWSER_EXECUTABLE") ??
      Deno.env.get("PUPPETEER_EXECUTABLE_PATH"),
  );
  if (explicit) return explicit;

  const candidates =
    Deno.build.os === "windows" ? WINDOWS_LOCAL_BROWSER_CANDIDATES : UNIX_LOCAL_BROWSER_CANDIDATES;
  for (const candidate of candidates) {
    try {
      await Deno.stat(candidate);
      return candidate;
    } catch {}
  }
  return "";
}

async function requireDirectorAuth(request: Request, supabaseUrl: string) {
  const anonKey = cleanText(Deno.env.get("SUPABASE_ANON_KEY"));
  const authHeader = cleanText(request.headers.get("Authorization"));

  if (!anonKey || !authHeader) {
    throw createDirectorPdfErrorResponse({
      status: 401,
      errorCode: "auth_failed",
      error: "Unauthorized.",
      documentKind: "subcontract_report",
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

  const [{ data: userData, error: userError }, { data: roleData, error: roleError }] = await Promise.all([
    requester.auth.getUser(),
    requester.rpc("get_my_role"),
  ]);

  if (userError || !userData?.user) {
    throw createDirectorPdfErrorResponse({
      status: 401,
      errorCode: "auth_failed",
      error: "Unauthorized.",
      documentKind: "subcontract_report",
    });
  }

  const roleAccess = resolveDirectorPdfRoleAccess({
    user: userData.user,
    rpcRole: roleData,
  });

  if (!roleAccess.isDirector) {
    console.warn(
      `[${FUNCTION_NAME}] director auth forbidden ${JSON.stringify({
        userId: userData.user.id,
        appMetadataRole: roleAccess.appMetadataRole,
        rpcRole: roleAccess.rpcRole,
        roleError: roleError?.message ?? null,
      })}`,
    );
    throw createDirectorPdfErrorResponse({
      status: 403,
      errorCode: "auth_failed",
      error: "Forbidden.",
      documentKind: "subcontract_report",
    });
  }

  if (roleAccess.source === "app_metadata" && roleAccess.rpcRole !== "director") {
    console.info(
      `[${FUNCTION_NAME}] director auth resolved from signed app_metadata ${JSON.stringify({
        userId: userData.user.id,
        appMetadataRole: roleAccess.appMetadataRole,
        rpcRole: roleAccess.rpcRole,
        roleError: roleError?.message ?? null,
      })}`,
    );
  }

  return {
    userId: userData.user.id,
  };
}

function validateSubcontractSourceEnvelope(value: unknown): Required<SubcontractSourceEnvelope> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pdf_director_subcontract_source_v1 returned non-object payload");
  }

  const root = value as SubcontractSourceEnvelope;
  if (cleanText(root.document_type) !== "director_subcontract_report") {
    throw new Error(
      `pdf_director_subcontract_source_v1 invalid document_type: ${cleanText(root.document_type) || "<empty>"}`,
    );
  }
  if (cleanText(root.version) !== "v1") {
    throw new Error(
      `pdf_director_subcontract_source_v1 invalid version: ${cleanText(root.version) || "<empty>"}`,
    );
  }
  if (!Array.isArray(root.rows)) {
    throw new Error("pdf_director_subcontract_source_v1 missing rows");
  }

  return {
    document_type: "director_subcontract_report",
    version: "v1",
    rows: root.rows,
  };
}

async function loadSubcontractSource(
  admin: ReturnType<typeof createClient>,
  payload: ReturnType<typeof normalizeDirectorSubcontractReportPdfRequest>,
) {
  const { data, error } = await admin.rpc("pdf_director_subcontract_source_v1", {
    p_from: payload.periodFrom ?? null,
    p_to: payload.periodTo ?? null,
    p_object_name: payload.objectName ?? null,
  });

  if (error) {
    throw new Error(`pdf_director_subcontract_source_v1 failed: ${error.message}`);
  }

  return validateSubcontractSourceEnvelope(data);
}

function buildFileName(payload: ReturnType<typeof normalizeDirectorSubcontractReportPdfRequest>) {
  const parts = [
    "director_subcontract_report",
    payload.objectName ?? "",
    payload.periodTo ?? payload.periodFrom ?? "",
  ].filter(Boolean);
  return normalizePdfFileName(parts.join("_"));
}

async function renderPdfBytes(html: string) {
  const browserWsEndpoint = resolveBrowserWsEndpoint();
  const browserUrl = browserWsEndpoint ? "" : resolveBrowserUrl();
  const localExecutable = browserWsEndpoint || browserUrl ? "" : await resolveLocalBrowserExecutable();

  let browser = null;
  let page = null;

  try {
    if (browserWsEndpoint) {
      browser = await puppeteer.connect({
        browserWSEndpoint: browserWsEndpoint,
        defaultViewport: null,
      });
    } else if (browserUrl) {
      browser = await puppeteer.connect({
        browserURL: browserUrl,
        defaultViewport: null,
      });
    } else if (localExecutable) {
      browser = await puppeteer.launch({
        executablePath: localExecutable,
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
        defaultViewport: null,
      });
    } else {
      throw new Error("No browser renderer configured. Set DIRECTOR_PDF_BROWSERLESS_WS_ENDPOINT or a local browser executable.");
    }

    page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
    });

    const client = await page.target().createCDPSession();
    const result = await client.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      paperWidth: 8.27,
      paperHeight: 11.69,
    });
    const base64 = cleanText(result?.data);
    if (!base64) {
      throw new Error("Page.printToPDF returned empty data");
    }
    const binary = atob(base64);
    const pdfBytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      pdfBytes[index] = binary.charCodeAt(index);
    }
    return {
      pdfBytes,
      renderer: browserWsEndpoint ? "browserless_puppeteer" : "local_browser_puppeteer",
    };
  } finally {
    try {
      if (page) await page.close();
    } catch {}
    try {
      if (browser) await browser.close();
    } catch {}
  }
}

async function uploadPdfAndSignUrl(args: {
  admin: ReturnType<typeof createClient>;
  fileName: string;
  bytes: Uint8Array;
}) {
  const bucketId = cleanText(Deno.env.get("DIRECTOR_PDF_RENDER_BUCKET")) || DEFAULT_BUCKET;
  const storagePath = buildStoragePath(args.fileName);
  const ttlSeconds = resolveSignedUrlTtlSeconds();

  const upload = await args.admin.storage.from(bucketId).upload(storagePath, args.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    throw new Error(`Storage upload failed: ${upload.error.message}`);
  }

  const signed = await args.admin.storage.from(bucketId).createSignedUrl(storagePath, ttlSeconds);
  if (signed.error) {
    throw new Error(`createSignedUrl failed: ${signed.error.message}`);
  }

  const signedUrl = cleanText(signed.data?.signedUrl);
  if (!signedUrl) {
    throw new Error("createSignedUrl returned empty URL.");
  }

  return {
    bucketId,
    storagePath,
    signedUrl,
    expiresInSeconds: ttlSeconds,
  };
}

const LOCAL_PORT = Number(Deno.env.get("PORT") ?? 8000);

Deno.serve({ port: Number.isFinite(LOCAL_PORT) && LOCAL_PORT > 0 ? Math.trunc(LOCAL_PORT) : 8000 }, async (request) => {
  if (request.method === "OPTIONS") {
    return createDirectorPdfOptionsResponse();
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase service role env is not configured." });
  }

  let payload;
  try {
    payload = normalizeDirectorSubcontractReportPdfRequest(await request.json());
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid JSON body.",
    });
  }

  try {
    await requireDirectorAuth(request, supabaseUrl);
  } catch (response) {
    if (response instanceof Response) return response;
    return json(401, { error: "Unauthorized." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    console.info(`[${FUNCTION_NAME}] stage_auth_ok`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
    });
    const source = await loadSubcontractSource(admin, payload);
    console.info(`[${FUNCTION_NAME}] stage_source_loaded`, {
      rows: Array.isArray(source.rows) ? source.rows.length : 0,
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
    });
    const model = prepareDirectorSubcontractReportPdfModelShared(
      {
        companyName: payload.companyName,
        generatedBy: payload.generatedBy,
        periodFrom: payload.periodFrom,
        periodTo: payload.periodTo,
        objectName: payload.objectName,
      },
      source.rows,
    );
    console.info(`[${FUNCTION_NAME}] stage_model_ready`, {
      contractorRows: model.contractorRows.length,
      objectRows: model.objectRows.length,
      approvedRows: model.approvedRows.length,
      workRows: model.workRows.length,
    });
    const html = renderDirectorSubcontractReportPdfHtml(model);
    console.info(`[${FUNCTION_NAME}] stage_html_ready`, {
      htmlLength: html.length,
    });
    const { pdfBytes, renderer } = await renderPdfBytes(html);
    console.info(`[${FUNCTION_NAME}] stage_pdf_ready`, {
      renderer,
      sizeBytes: pdfBytes.byteLength,
    });
    const fileName = buildFileName(payload);
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      fileName,
      bytes: pdfBytes,
    });

    console.info(`[${FUNCTION_NAME}] backend_subcontract_report_v1`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      sizeBytes: pdfBytes.byteLength,
      renderer,
    });

    return createDirectorPdfSuccessResponse({
      ok: true,
      renderVersion: "v1",
      renderBranch: "backend_subcontract_report_v1",
      renderer,
      sourceKind: "remote-url",
      documentKind: "subcontract_report",
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      expiresInSeconds: uploaded.expiresInSeconds,
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] render_failed`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    });
    return createDirectorPdfErrorResponse({
      status: 500,
      errorCode: "backend_pdf_failed",
      error: error instanceof Error ? error.message : "Director subcontract report PDF render failed.",
      documentKind: "subcontract_report",
      renderBranch: "backend_subcontract_report_v1",
    });
  }
});
