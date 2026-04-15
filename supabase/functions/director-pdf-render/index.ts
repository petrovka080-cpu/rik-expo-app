/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveDirectorPdfRoleAccess } from "../../../src/lib/pdf/directorPdfAuth.ts";
import {
  createDirectorPdfErrorResponse,
  createDirectorPdfOptionsResponse,
  createDirectorPdfSuccessResponse,
} from "../../../src/lib/pdf/directorPdfPlatformContract.ts";

const FUNCTION_NAME = "director-pdf-render";
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

const DOC_KIND_TO_STEM = {
  finance_preview: "director_finance_preview",
  management_report: "director_management_report",
  supplier_summary: "director_supplier_summary",
  production_report: "director_production_report",
  subcontract_report: "director_subcontract_report",
} as const;

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
      .replace(/^_+|_+$/g, "") || "director_pdf"
  );
}

function normalizePdfFileName(documentKind: string, rawFileName?: unknown) {
  const requested = cleanText(rawFileName);
  const safeStem = sanitizeStem(
    requested.replace(/\.pdf$/i, "") ||
      DOC_KIND_TO_STEM[documentKind as keyof typeof DOC_KIND_TO_STEM] ||
      "director_pdf",
  );
  return `${safeStem}.pdf`;
}

function buildStoragePath(documentKind: string, fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const nonce = crypto.randomUUID().slice(0, 8);
  return `director/${sanitizeStem(documentKind)}/${yyyy}/${mm}/${dd}/${stamp}_${nonce}_${fileName}`;
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

  // D-BACKEND-PDF: Optimized auth flow.
  // Step 1: Always call getUser() to validate the JWT.
  const { data: userData, error: userError } = await requester.auth.getUser();

  if (userError || !userData?.user) {
    throw createDirectorPdfErrorResponse({
      status: 401,
      errorCode: "auth_failed",
      error: "Unauthorized.",
    });
  }

  // Step 2: Check app_metadata.role first (signed into JWT, trustworthy).
  // If it resolves to director, skip the get_my_role RPC entirely (saves 100-300ms).
  const appMetadataCheck = resolveDirectorPdfRoleAccess({
    user: userData.user,
    rpcRole: undefined, // no RPC call yet
  });

  if (appMetadataCheck.isDirector && appMetadataCheck.source === "app_metadata") {
    console.info(
      `[${FUNCTION_NAME}] director auth fast-path via app_metadata ${JSON.stringify({
        userId: userData.user.id,
        appMetadataRole: appMetadataCheck.appMetadataRole,
        rpcSkipped: true,
      })}`,
    );
    return {
      userId: userData.user.id,
      authSource: "app_metadata" as const,
    };
  }

  // Step 3: Fallback — call get_my_role RPC when app_metadata doesn't resolve.
  const { data: roleData, error: roleError } = await requester.rpc("get_my_role");

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
      documentKind: "management_report",
    });
  }

  return {
    userId: userData.user.id,
    authSource: roleAccess.source as "app_metadata" | "rpc",
  };
}

function validatePayload(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid JSON body.");
  }

  const payload = raw as Record<string, unknown>;
  const version = cleanText(payload.version);
  const documentKind = cleanText(payload.documentKind);
  const documentType = cleanText(payload.documentType);
  const html = String(payload.html ?? "");
  const source = cleanText(payload.source);
  const branchDiagnostics =
    payload.branchDiagnostics && typeof payload.branchDiagnostics === "object" && !Array.isArray(payload.branchDiagnostics)
      ? (payload.branchDiagnostics as Record<string, unknown>)
      : {};

  if (version !== "v1") throw new Error("version must be v1.");
  if (!documentKind) throw new Error("documentKind is required.");
  if (!(documentKind in DOC_KIND_TO_STEM)) throw new Error(`Unsupported documentKind: ${documentKind}`);
  if (!documentType) throw new Error("documentType is required.");
  if (!html.trim()) throw new Error("html is required.");
  if (!source) throw new Error("source is required.");

  return {
    version: "v1" as const,
    documentKind,
    documentType,
    html,
    source,
    fileName: cleanText(payload.fileName),
    branchDiagnostics: {
      sourceBranch: cleanText(branchDiagnostics.sourceBranch) || null,
      sourceFallbackReason: cleanText(branchDiagnostics.sourceFallbackReason) || null,
    },
  };
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
      });
    } else if (browserUrl) {
      browser = await puppeteer.connect({
        browserURL: browserUrl,
      });
    } else if (localExecutable) {
      browser = await puppeteer.launch({
        executablePath: localExecutable,
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
    } else {
      throw new Error("No PDF renderer is configured.");
    }

    page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
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
  documentKind: string;
  fileName: string;
  bytes: Uint8Array;
}) {
  const bucketId = cleanText(Deno.env.get("DIRECTOR_PDF_RENDER_BUCKET")) || DEFAULT_BUCKET;
  const storagePath = buildStoragePath(args.documentKind, args.fileName);
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
    return createDirectorPdfErrorResponse({
      status: 405,
      errorCode: "validation_failed",
      error: "Method not allowed.",
    });
  }

  let payload;
  try {
    payload = validatePayload(await request.json());
  } catch (error) {
    return createDirectorPdfErrorResponse({
      status: 400,
      errorCode: "validation_failed",
      error: error instanceof Error ? error.message : "Invalid JSON body.",
    });
  }

  const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const browserWsEndpoint = resolveBrowserWsEndpoint();
  const browserUrl = browserWsEndpoint ? "" : resolveBrowserUrl();
  const localExecutable = browserWsEndpoint || browserUrl ? "" : await resolveLocalBrowserExecutable();

  if (!supabaseUrl || !serviceRoleKey) {
    return createDirectorPdfErrorResponse({
      status: 500,
      errorCode: "backend_pdf_failed",
      error: "Supabase service role env is not configured.",
      documentKind: payload.documentKind,
    });
  }
  if (!browserWsEndpoint && !browserUrl && !localExecutable) {
    return createDirectorPdfErrorResponse({
      status: 503,
      errorCode: "backend_pdf_failed",
      error: "No PDF renderer is configured.",
      documentKind: payload.documentKind,
    });
  }

  // D-BACKEND-PDF: per-segment timing telemetry
  const tAuthStart = Date.now();
  let authResult;
  try {
    authResult = await requireDirectorAuth(request, supabaseUrl);
  } catch (response) {
    if (response instanceof Response) return response;
    return createDirectorPdfErrorResponse({
      status: 401,
      errorCode: "auth_failed",
      error: "Unauthorized.",
      documentKind: payload.documentKind,
    });
  }
  const tAuthEnd = Date.now();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const tRenderStart = Date.now();
    const { pdfBytes, renderer } = await renderPdfBytes(payload.html);
    const tRenderEnd = Date.now();

    const fileName = normalizePdfFileName(payload.documentKind, payload.fileName);
    const tUploadStart = Date.now();
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      documentKind: payload.documentKind,
      fileName,
      bytes: pdfBytes,
    });
    const tUploadEnd = Date.now();

    const timingTelemetry = {
      authMs: tAuthEnd - tAuthStart,
      authSource: authResult.authSource,
      renderMs: tRenderEnd - tRenderStart,
      uploadAndSignMs: tUploadEnd - tUploadStart,
      totalMs: tUploadEnd - tAuthStart,
      htmlLength: payload.html.length,
      pdfSizeBytes: pdfBytes.byteLength,
    };

    console.info(`[${FUNCTION_NAME}] edge_render_v1`, {
      documentKind: payload.documentKind,
      documentType: payload.documentType,
      source: payload.source,
      sourceBranch: payload.branchDiagnostics.sourceBranch,
      sourceFallbackReason: payload.branchDiagnostics.sourceFallbackReason,
      ...timingTelemetry,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
    });

    return createDirectorPdfSuccessResponse({
      ok: true,
      renderVersion: "v1",
      renderBranch: "edge_render_v1",
      renderer,
      sourceKind: "remote-url",
      documentKind: payload.documentKind,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      expiresInSeconds: uploaded.expiresInSeconds,
      // D-BACKEND-PDF: include timing telemetry in response
      telemetry: timingTelemetry,
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] render_failed`, {
      documentKind: payload.documentKind,
      documentType: payload.documentType,
      source: payload.source,
      sourceBranch: payload.branchDiagnostics.sourceBranch,
      sourceFallbackReason: payload.branchDiagnostics.sourceFallbackReason,
      error: error instanceof Error ? error.message : String(error),
    });
    return createDirectorPdfErrorResponse({
      status: 500,
      errorCode: "backend_pdf_failed",
      error: error instanceof Error ? error.message : "Director PDF render failed.",
      documentKind: payload.documentKind,
      renderBranch: "edge_render_v1",
    });
  }
});
