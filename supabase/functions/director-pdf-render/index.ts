/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveDirectorPdfRoleAccess } from "../../../src/lib/pdf/directorPdfAuth.ts";
import {
  DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND,
  DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION,
  DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION,
} from "../../../src/lib/pdf/directorPdfPlatformContract.ts";
import {
  createDirectorPdfErrorResponse,
  createDirectorPdfOptionsResponse,
  createDirectorPdfSuccessResponse,
} from "../../../src/lib/pdf/directorPdfPlatformContract.ts";

const FUNCTION_NAME = "director-pdf-render";
const DEFAULT_BUCKET = "director_pdf_exports";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const FINANCE_MANAGEMENT_ARTIFACT_ROOT = "director/management_report/artifacts/v1/";
const FINANCE_MANAGEMENT_MANIFEST_ROOT = "director/management_report/manifests/v1/";
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

function normalizeFinanceManagementManifest(raw: unknown, documentKind: string) {
  if (raw == null) return null;
  if (documentKind !== "management_report") {
    throw new Error("financeManagementManifest is only supported for management_report.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("financeManagementManifest must be an object.");
  }

  const manifest = raw as Record<string, unknown>;
  const version = cleanText(manifest.version);
  const manifestDocumentKind = cleanText(manifest.documentKind);
  const sourceVersion = cleanText(manifest.sourceVersion);
  const artifactVersion = cleanText(manifest.artifactVersion);
  const templateVersion = cleanText(manifest.templateVersion);
  const renderContractVersion = cleanText(manifest.renderContractVersion);
  const artifactPath = cleanText(manifest.artifactPath);
  const manifestPath = cleanText(manifest.manifestPath);
  const fileName = normalizePdfFileName(documentKind, manifest.fileName);
  const documentScope =
    manifest.documentScope && typeof manifest.documentScope === "object" && !Array.isArray(manifest.documentScope)
      ? manifest.documentScope
      : null;

  if (version !== DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION) {
    throw new Error("financeManagementManifest invalid version.");
  }
  if (manifestDocumentKind !== DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND) {
    throw new Error("financeManagementManifest invalid documentKind.");
  }
  if (!documentScope) throw new Error("financeManagementManifest documentScope is required.");
  if (!sourceVersion) throw new Error("financeManagementManifest sourceVersion is required.");
  if (!artifactVersion) throw new Error("financeManagementManifest artifactVersion is required.");
  if (templateVersion !== DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION) {
    throw new Error("financeManagementManifest invalid templateVersion.");
  }
  if (renderContractVersion !== DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION) {
    throw new Error("financeManagementManifest invalid renderContractVersion.");
  }
  if (!artifactPath.startsWith(FINANCE_MANAGEMENT_ARTIFACT_ROOT)) {
    throw new Error("financeManagementManifest invalid artifactPath.");
  }
  if (!manifestPath.startsWith(FINANCE_MANAGEMENT_MANIFEST_ROOT)) {
    throw new Error("financeManagementManifest invalid manifestPath.");
  }

  return {
    version,
    documentKind: manifestDocumentKind,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion,
    renderContractVersion,
    artifactPath,
    manifestPath,
    fileName,
    lastSourceChangeAt: cleanText(manifest.lastSourceChangeAt) || null,
  };
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

function resolveBucketId() {
  return cleanText(Deno.env.get("DIRECTOR_PDF_RENDER_BUCKET")) || DEFAULT_BUCKET;
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

  const [
    { data: roleData, error: roleError },
    { data: membershipRows, error: membershipError },
    { data: developerOverride },
  ] = await Promise.all([
    requester.rpc("get_my_role"),
    requester
      .from("company_members")
      .select("role")
      .eq("user_id", userData.user.id),
    requester.rpc("developer_override_context_v1"),
  ]);

  const roleAccess = resolveDirectorPdfRoleAccess({
    user: userData.user,
    rpcRole: roleData,
    companyMemberRoles: Array.isArray(membershipRows)
      ? membershipRows.map((row) => row?.role)
      : [],
    developerOverrideActive: developerOverride?.isActive === true,
    developerOverrideEffectiveRole: developerOverride?.activeEffectiveRole,
  });

  if (!roleAccess.isDirector) {
    console.warn(
      `[${FUNCTION_NAME}] director auth forbidden ${JSON.stringify({
        userId: userData.user.id,
        companyMemberRoles: roleAccess.companyMemberRoles,
        appMetadataRole: roleAccess.appMetadataRole,
        rpcRole: roleAccess.rpcRole,
        membershipError: membershipError?.message ?? null,
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
    authSource: roleAccess.source as "developer_override" | "company_members" | "app_metadata" | "rpc",
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
    financeManagementManifest: normalizeFinanceManagementManifest(payload.financeManagementManifest, documentKind),
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
  storagePath?: string | null;
}) {
  const bucketId = resolveBucketId();
  const storagePath = cleanText(args.storagePath) || buildStoragePath(args.documentKind, args.fileName);
  const ttlSeconds = resolveSignedUrlTtlSeconds();

  const upload = await args.admin.storage.from(bucketId).upload(storagePath, args.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    if (args.storagePath && isStorageAlreadyExistsError(upload.error)) {
      const existing = await trySignExistingPdfArtifact({
        admin: args.admin,
        bucketId,
        storagePath,
      });
      if (existing) return existing;
    }
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

function isStorageAlreadyExistsError(error: unknown) {
  const message = cleanText((error as { message?: unknown } | null)?.message).toLowerCase();
  const status = cleanText((error as { statusCode?: unknown } | null)?.statusCode);
  return status === "409" || message.includes("already exists") || message.includes("duplicate");
}

async function trySignExistingPdfArtifact(args: {
  admin: ReturnType<typeof createClient>;
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
  const exists = listed.data.some((item) => cleanText(item?.name) === objectName);
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

async function readFinanceManagementManifest(args: {
  admin: ReturnType<typeof createClient>;
  bucketId: string;
  manifestPath: string;
}) {
  const downloaded = await args.admin.storage.from(args.bucketId).download(args.manifestPath);
  if (downloaded.error || !downloaded.data) return null;
  try {
    const text = await downloaded.data.text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeFinanceManagementManifest(args: {
  admin: ReturnType<typeof createClient>;
  bucketId: string;
  manifestPath: string;
  manifest: Record<string, unknown>;
}) {
  const body = JSON.stringify(args.manifest, null, 2);
  const uploaded = await args.admin.storage.from(args.bucketId).upload(
    args.manifestPath,
    new Blob([body], { type: "application/json; charset=utf-8" }),
    {
      contentType: "application/json; charset=utf-8",
      upsert: true,
    },
  );
  if (uploaded.error) {
    throw new Error(`Finance management manifest write failed: ${uploaded.error.message}`);
  }
}

function buildFinanceManagementManifestRecord(args: {
  contract: ReturnType<typeof normalizeFinanceManagementManifest>;
  status: "ready" | "building" | "stale" | "failed" | "missing";
  previous: Record<string, unknown> | null;
  bucketId: string;
  errorCode?: string | null;
  errorSummary?: string | null;
}) {
  const nowIso = new Date().toISOString();
  const previousLastSuccessful =
    args.previous?.last_successful_artifact &&
    typeof args.previous.last_successful_artifact === "object" &&
    !Array.isArray(args.previous.last_successful_artifact)
      ? args.previous.last_successful_artifact
      : null;
  const previousBuiltAt = cleanText(args.previous?.last_built_at) || null;
  const isReady = args.status === "ready";
  const lastBuiltAt = isReady ? previousBuiltAt || nowIso : previousBuiltAt;
  const lastSuccessfulArtifact = isReady
    ? {
        bucket_id: args.bucketId,
        storage_path: args.contract.artifactPath,
        artifact_version: args.contract.artifactVersion,
        file_name: args.contract.fileName,
        built_at: lastBuiltAt,
      }
    : previousLastSuccessful;

  return {
    manifest_version: DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
    artifact_contract_version: DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION,
    document_kind: args.contract.documentKind,
    document_scope: args.contract.documentScope,
    source_version: args.contract.sourceVersion,
    artifact_version: args.contract.artifactVersion,
    status: args.status,
    artifact_path: args.contract.artifactPath,
    artifact_url: null,
    last_built_at: lastBuiltAt,
    last_source_change_at: args.contract.lastSourceChangeAt,
    last_successful_artifact: lastSuccessfulArtifact,
    template_version: args.contract.templateVersion,
    render_contract_version: args.contract.renderContractVersion,
    error_code: args.errorCode ?? null,
    error_summary: args.errorSummary ?? null,
    updated_at: nowIso,
  };
}

async function writeFinanceManagementManifestStatus(args: {
  admin: ReturnType<typeof createClient>;
  bucketId: string;
  contract: ReturnType<typeof normalizeFinanceManagementManifest>;
  status: "ready" | "building" | "stale" | "failed" | "missing";
  previous: Record<string, unknown> | null;
  errorCode?: string | null;
  errorSummary?: string | null;
}) {
  if (!args.contract) return null;
  const manifest = buildFinanceManagementManifestRecord({
    contract: args.contract,
    status: args.status,
    previous: args.previous,
    bucketId: args.bucketId,
    errorCode: args.errorCode,
    errorSummary: args.errorSummary,
  });
  await writeFinanceManagementManifest({
    admin: args.admin,
    bucketId: args.bucketId,
    manifestPath: args.contract.manifestPath,
    manifest,
  });
  return manifest;
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
  const financeManagementManifest = payload.financeManagementManifest;
  let financeManagementPreviousManifest: Record<string, unknown> | null = null;

  try {
    const bucketId = resolveBucketId();
    const tManifestStart = Date.now();
    if (financeManagementManifest) {
      financeManagementPreviousManifest = await readFinanceManagementManifest({
        admin,
        bucketId,
        manifestPath: financeManagementManifest.manifestPath,
      });
      const cachedArtifact = await trySignExistingPdfArtifact({
        admin,
        bucketId,
        storagePath: financeManagementManifest.artifactPath,
      });
      if (cachedArtifact) {
        await writeFinanceManagementManifestStatus({
          admin,
          bucketId,
          contract: financeManagementManifest,
          status: "ready",
          previous: financeManagementPreviousManifest,
        });

        const manifestMs = Date.now() - tManifestStart;
        console.info(`[${FUNCTION_NAME}] finance_management_artifact_hit`, {
          documentKind: payload.documentKind,
          source: payload.source,
          sourceVersion: financeManagementManifest.sourceVersion,
          artifactVersion: financeManagementManifest.artifactVersion,
          manifestPath: financeManagementManifest.manifestPath,
          storagePath: cachedArtifact.storagePath,
          manifestMs,
        });

        return createDirectorPdfSuccessResponse({
          ok: true,
          renderVersion: "v1",
          renderBranch: "edge_render_v1",
          renderer: "artifact_cache",
          sourceKind: "remote-url",
          documentKind: payload.documentKind,
          bucketId: cachedArtifact.bucketId,
          storagePath: cachedArtifact.storagePath,
          signedUrl: cachedArtifact.signedUrl,
          fileName: financeManagementManifest.fileName,
          expiresInSeconds: cachedArtifact.expiresInSeconds,
          telemetry: {
            cacheStatus: "artifact_hit",
            manifestStatus: "ready",
            manifestVersion: DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
            artifactContractVersion: DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION,
            sourceVersion: financeManagementManifest.sourceVersion,
            artifactVersion: financeManagementManifest.artifactVersion,
            templateVersion: financeManagementManifest.templateVersion,
            renderContractVersion: financeManagementManifest.renderContractVersion,
            manifestPath: financeManagementManifest.manifestPath,
            manifestMs,
            authMs: tAuthEnd - tAuthStart,
            authSource: authResult.authSource,
            renderMs: 0,
            uploadAndSignMs: 0,
            totalMs: Date.now() - tAuthStart,
            htmlLength: payload.html.length,
            pdfSizeBytes: 0,
          },
        });
      }

      const previousSourceVersion = cleanText(financeManagementPreviousManifest?.source_version);
      if (previousSourceVersion && previousSourceVersion !== financeManagementManifest.sourceVersion) {
        await writeFinanceManagementManifestStatus({
          admin,
          bucketId,
          contract: financeManagementManifest,
          status: "stale",
          previous: financeManagementPreviousManifest,
        });
      } else if (!financeManagementPreviousManifest) {
        await writeFinanceManagementManifestStatus({
          admin,
          bucketId,
          contract: financeManagementManifest,
          status: "missing",
          previous: null,
        });
      }

      await writeFinanceManagementManifestStatus({
        admin,
        bucketId,
        contract: financeManagementManifest,
        status: "building",
        previous: financeManagementPreviousManifest,
      });
    }

    const tRenderStart = Date.now();
    const { pdfBytes, renderer } = await renderPdfBytes(payload.html);
    const tRenderEnd = Date.now();

    const fileName = financeManagementManifest?.fileName ?? normalizePdfFileName(payload.documentKind, payload.fileName);
    const tUploadStart = Date.now();
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      documentKind: payload.documentKind,
      fileName,
      bytes: pdfBytes,
      storagePath: financeManagementManifest?.artifactPath ?? null,
    });
    const tUploadEnd = Date.now();

    if (financeManagementManifest) {
      await writeFinanceManagementManifestStatus({
        admin,
        bucketId,
        contract: financeManagementManifest,
        status: "ready",
        previous: financeManagementPreviousManifest,
      });
    }

    const timingTelemetry = {
      authMs: tAuthEnd - tAuthStart,
      authSource: authResult.authSource,
      cacheStatus: financeManagementManifest ? "artifact_miss" : "none",
      manifestStatus: financeManagementManifest ? "ready" : null,
      manifestVersion: financeManagementManifest ? DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION : null,
      artifactContractVersion: financeManagementManifest ? DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION : null,
      sourceVersion: financeManagementManifest?.sourceVersion ?? null,
      artifactVersion: financeManagementManifest?.artifactVersion ?? null,
      templateVersion: financeManagementManifest?.templateVersion ?? null,
      renderContractVersion: financeManagementManifest?.renderContractVersion ?? null,
      manifestPath: financeManagementManifest?.manifestPath ?? null,
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
      cacheStatus: financeManagementManifest ? "artifact_miss" : "none",
      manifestPath: financeManagementManifest?.manifestPath ?? null,
      sourceVersion: financeManagementManifest?.sourceVersion ?? null,
      artifactVersion: financeManagementManifest?.artifactVersion ?? null,
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
    if (financeManagementManifest) {
      try {
        await writeFinanceManagementManifestStatus({
          admin,
          bucketId: resolveBucketId(),
          contract: financeManagementManifest,
          status: "failed",
          previous: financeManagementPreviousManifest,
          errorCode: "backend_pdf_failed",
          errorSummary: error instanceof Error ? error.message : String(error),
        });
      } catch (manifestError) {
        console.warn(`[${FUNCTION_NAME}] finance_management_manifest_failed_write_failed`, {
          manifestPath: financeManagementManifest.manifestPath,
          error: manifestError instanceof Error ? manifestError.message : String(manifestError),
        });
      }
    }
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
