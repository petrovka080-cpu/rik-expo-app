/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { adaptCanonicalMaterialsPayload, adaptCanonicalWorksPayload } from "../../../src/lib/api/director_reports.adapters.ts";
import { renderDirectorProductionReportPdfHtml } from "../../../src/lib/pdf/director/production.ts";
import {
  normalizeDirectorProductionReportPdfRequest,
  prepareDirectorProductionReportPdfModelShared,
} from "../../../src/lib/pdf/directorProductionReport.shared.ts";
import { resolveDirectorPdfRoleAccess } from "../../../src/lib/pdf/directorPdfAuth.ts";
import {
  createDirectorPdfErrorResponse,
  createDirectorPdfOptionsResponse,
  createDirectorPdfSuccessResponse,
} from "../../../src/lib/pdf/directorPdfPlatformContract.ts";

const FUNCTION_NAME = "director-production-report-pdf";
const DEFAULT_BUCKET = "director_pdf_exports";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const PRODUCTION_ARTIFACT_CACHE_VERSION = "pdf_x_b1_director_production_artifact_v1";
const PRODUCTION_ARTIFACT_TEMPLATE_VERSION = "director_production_report_template_v1";
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

type ProductionSourceEnvelope = {
  document_type?: string;
  version?: string;
  generated_at?: unknown;
  document_id?: unknown;
  meta?: unknown;
  report_payload?: unknown;
  discipline_payload?: unknown;
};

function json(status: number, body: Record<string, unknown>) {
  return createDirectorPdfErrorResponse({
    status,
    errorCode: status === 401 || status === 403 ? "auth_failed" : status >= 500 ? "backend_pdf_failed" : "validation_failed",
    error: String(body.error ?? "Director production report PDF render failed."),
    documentKind: "production_report",
    renderBranch: status >= 500 ? "backend_production_report_v1" : undefined,
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
      .replace(/^_+|_+$/g, "") || "director_production_report"
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
  return `director/production_report/${yyyy}/${mm}/${dd}/${stamp}_${nonce}_${fileName}`;
}

function buildProductionArtifactStoragePath(args: {
  artifactVersion: string;
  fileName: string;
}) {
  return `director/production_report/artifacts/v1/${sanitizeStem(args.artifactVersion)}/${args.fileName}`;
}

function resolveBucketId() {
  return cleanText(Deno.env.get("DIRECTOR_PDF_RENDER_BUCKET")) || DEFAULT_BUCKET;
}

function resolveSignedUrlTtlSeconds() {
  const raw = Number(Deno.env.get("DIRECTOR_PDF_RENDER_SIGNED_URL_TTL_SECONDS") ?? NaN);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SIGNED_URL_TTL_SECONDS;
  return Math.floor(raw);
}

function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
      documentKind: "production_report",
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

  const [
    { data: userData, error: userError },
    { data: roleData, error: roleError },
    { data: developerOverride },
  ] = await Promise.all([
    requester.auth.getUser(),
    requester.rpc("get_my_role"),
    requester.rpc("developer_override_context_v1"),
  ]);

  if (userError || !userData?.user) {
    throw createDirectorPdfErrorResponse({
      status: 401,
      errorCode: "auth_failed",
      error: "Unauthorized.",
      documentKind: "production_report",
    });
  }

  const { data: membershipRows, error: membershipError } = await requester
    .from("company_members")
    .select("role")
    .eq("user_id", userData.user.id);

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
      documentKind: "production_report",
    });
  }

  if (roleAccess.source !== "company_members" && roleAccess.rpcRole !== "director") {
    console.info(
      `[${FUNCTION_NAME}] director auth resolved from fallback role source ${JSON.stringify({
        userId: userData.user.id,
        source: roleAccess.source,
        companyMemberRoles: roleAccess.companyMemberRoles,
        appMetadataRole: roleAccess.appMetadataRole,
        rpcRole: roleAccess.rpcRole,
        membershipError: membershipError?.message ?? null,
        roleError: roleError?.message ?? null,
      })}`,
    );
  }

  return {
    userId: userData.user.id,
  };
}

function validateProductionSourceEnvelope(value: unknown): Required<ProductionSourceEnvelope> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pdf_director_production_source_v1 returned non-object payload");
  }

  const root = value as ProductionSourceEnvelope;
  if (cleanText(root.document_type) !== "director_production_report") {
    throw new Error(
      `pdf_director_production_source_v1 invalid document_type: ${cleanText(root.document_type) || "<empty>"}`,
    );
  }
  if (cleanText(root.version) !== "v1") {
    throw new Error(
      `pdf_director_production_source_v1 invalid version: ${cleanText(root.version) || "<empty>"}`,
    );
  }
  if (!root.report_payload || !root.discipline_payload) {
    throw new Error("pdf_director_production_source_v1 missing report payload");
  }

  return {
    document_type: "director_production_report",
    version: "v1",
    generated_at: root.generated_at ?? null,
    document_id: root.document_id ?? null,
    meta: root.meta ?? null,
    report_payload: root.report_payload,
    discipline_payload: root.discipline_payload,
  };
}

async function loadProductionSource(
  admin: ReturnType<typeof createClient>,
  payload: ReturnType<typeof normalizeDirectorProductionReportPdfRequest>,
) {
  const { data, error } = await admin.rpc("pdf_director_production_source_v1", {
    p_from: payload.periodFrom ?? null,
    p_to: payload.periodTo ?? null,
    p_object_name: payload.objectName ?? null,
    p_include_costs: payload.preferPriceStage !== "base",
  });

  if (error) {
    throw new Error(`pdf_director_production_source_v1 failed: ${error.message}`);
  }

  return validateProductionSourceEnvelope(data);
}

function buildFileName(payload: ReturnType<typeof normalizeDirectorProductionReportPdfRequest>) {
  const parts = [
    "director_production_report",
    payload.objectName ?? "",
    payload.periodTo ?? payload.periodFrom ?? "",
  ].filter(Boolean);
  return normalizePdfFileName(parts.join("_"));
}

async function buildProductionArtifactContract(args: {
  payload: ReturnType<typeof normalizeDirectorProductionReportPdfRequest>;
  source: Required<ProductionSourceEnvelope>;
  fileName: string;
}) {
  const sourceIdentity = {
    contractVersion: PRODUCTION_ARTIFACT_CACHE_VERSION,
    templateVersion: PRODUCTION_ARTIFACT_TEMPLATE_VERSION,
    request: {
      companyName: args.payload.companyName ?? null,
      generatedBy: args.payload.generatedBy ?? null,
      periodFrom: args.payload.periodFrom ?? null,
      periodTo: args.payload.periodTo ?? null,
      objectName: args.payload.objectName ?? null,
      preferPriceStage: args.payload.preferPriceStage ?? "priced",
    },
    source: {
      documentType: args.source.document_type,
      documentId: args.source.document_id ?? null,
      sourceMeta: args.source.meta ?? null,
      reportPayload: args.source.report_payload,
      disciplinePayload: args.source.discipline_payload,
    },
  };
  const sourceVersion = await sha256Hex(stableJsonStringify(sourceIdentity));
  const artifactVersion = `${PRODUCTION_ARTIFACT_TEMPLATE_VERSION}_${sourceVersion}`;
  return {
    sourceVersion,
    artifactVersion,
    storagePath: buildProductionArtifactStoragePath({
      artifactVersion,
      fileName: args.fileName,
    }),
  };
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

function isStorageAlreadyExistsError(error: unknown) {
  const message = cleanText((error as { message?: unknown } | null)?.message).toLowerCase();
  const status = cleanText((error as { statusCode?: unknown } | null)?.statusCode);
  return status === "409" || message.includes("already exists") || message.includes("duplicate");
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
      throw new Error("No browser renderer configured. Set DIRECTOR_PDF_BROWSERLESS_WS_ENDPOINT or a local browser executable.");
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
  fileName: string;
  bytes: Uint8Array;
  storagePath?: string;
}) {
  const bucketId = resolveBucketId();
  const storagePath = cleanText(args.storagePath) || buildStoragePath(args.fileName);
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
    payload = normalizeDirectorProductionReportPdfRequest(await request.json());
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
    const totalStartedAt = Date.now();
    console.info(`[${FUNCTION_NAME}] stage_auth_ok`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      preferPriceStage: payload.preferPriceStage ?? "priced",
    });
    const sourceStartedAt = Date.now();
    const source = await loadProductionSource(admin, payload);
    const sourceLoadedAt = Date.now();
    const fileName = buildFileName(payload);
    const artifact = await buildProductionArtifactContract({
      payload,
      source,
      fileName,
    });
    const cachedArtifact = await trySignExistingPdfArtifact({
      admin,
      bucketId: resolveBucketId(),
      storagePath: artifact.storagePath,
    });
    if (cachedArtifact) {
      console.info(`[${FUNCTION_NAME}] backend_production_report_artifact_hit`, {
        objectName: payload.objectName ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        preferPriceStage: payload.preferPriceStage ?? "priced",
        bucketId: cachedArtifact.bucketId,
        storagePath: cachedArtifact.storagePath,
        sourceVersion: artifact.sourceVersion,
        artifactVersion: artifact.artifactVersion,
        sourceMs: sourceLoadedAt - sourceStartedAt,
        totalMs: Date.now() - totalStartedAt,
      });

      return createDirectorPdfSuccessResponse({
        ok: true,
        renderVersion: "v1",
        renderBranch: "backend_production_report_v1",
        renderer: "artifact_cache",
        sourceKind: "remote-url",
        documentKind: "production_report",
        bucketId: cachedArtifact.bucketId,
        storagePath: cachedArtifact.storagePath,
        signedUrl: cachedArtifact.signedUrl,
        fileName,
        expiresInSeconds: cachedArtifact.expiresInSeconds,
        telemetry: {
          cacheStatus: "artifact_hit",
          cacheVersion: PRODUCTION_ARTIFACT_CACHE_VERSION,
          templateVersion: PRODUCTION_ARTIFACT_TEMPLATE_VERSION,
          sourceVersion: artifact.sourceVersion,
          artifactVersion: artifact.artifactVersion,
          sourceComputedAt: source.generated_at ?? null,
          sourceMs: sourceLoadedAt - sourceStartedAt,
          renderMs: 0,
          uploadAndSignMs: 0,
          totalMs: Date.now() - totalStartedAt,
        },
      });
    }

    const repData = adaptCanonicalMaterialsPayload(source.report_payload);
    const repDiscipline = adaptCanonicalWorksPayload(source.discipline_payload);
    if (!repData || !repDiscipline) {
      throw new Error("pdf_director_production_source_v1 payload adaptation failed");
    }
    console.info(`[${FUNCTION_NAME}] stage_source_loaded`, {
      materialRows: Array.isArray(repData.rows) ? repData.rows.length : 0,
      workRows: Array.isArray(repDiscipline.works) ? repDiscipline.works.length : 0,
      preferPriceStage: payload.preferPriceStage ?? "priced",
      sourceVersion: artifact.sourceVersion,
    });
    const model = prepareDirectorProductionReportPdfModelShared({
      companyName: payload.companyName,
      generatedBy: payload.generatedBy,
      periodFrom: payload.periodFrom,
      periodTo: payload.periodTo,
      objectName: payload.objectName,
      repData,
      repDiscipline,
    });
    console.info(`[${FUNCTION_NAME}] stage_model_ready`, {
      worksRows: model.worksRows.length,
      objectRows: model.objectRows.length,
      materialRows: model.materialRows.length,
    });
    const html = renderDirectorProductionReportPdfHtml(model);
    console.info(`[${FUNCTION_NAME}] stage_html_ready`, {
      htmlLength: html.length,
    });
    const renderStartedAt = Date.now();
    const { pdfBytes, renderer } = await renderPdfBytes(html);
    const renderFinishedAt = Date.now();
    console.info(`[${FUNCTION_NAME}] stage_pdf_ready`, {
      renderer,
      sizeBytes: pdfBytes.byteLength,
    });
    const uploadStartedAt = Date.now();
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      fileName,
      bytes: pdfBytes,
      storagePath: artifact.storagePath,
    });
    const uploadFinishedAt = Date.now();

    console.info(`[${FUNCTION_NAME}] backend_production_report_v1`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      preferPriceStage: payload.preferPriceStage ?? "priced",
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      sizeBytes: pdfBytes.byteLength,
      renderer,
      cacheStatus: "artifact_miss",
      sourceVersion: artifact.sourceVersion,
      artifactVersion: artifact.artifactVersion,
      sourceMs: sourceLoadedAt - sourceStartedAt,
      renderMs: renderFinishedAt - renderStartedAt,
      uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
      totalMs: uploadFinishedAt - totalStartedAt,
    });

    return createDirectorPdfSuccessResponse({
      ok: true,
      renderVersion: "v1",
      renderBranch: "backend_production_report_v1",
      renderer,
      sourceKind: "remote-url",
      documentKind: "production_report",
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      expiresInSeconds: uploaded.expiresInSeconds,
      telemetry: {
        cacheStatus: "artifact_miss",
        cacheVersion: PRODUCTION_ARTIFACT_CACHE_VERSION,
        templateVersion: PRODUCTION_ARTIFACT_TEMPLATE_VERSION,
        sourceVersion: artifact.sourceVersion,
        artifactVersion: artifact.artifactVersion,
        sourceComputedAt: source.generated_at ?? null,
        sourceMs: sourceLoadedAt - sourceStartedAt,
        renderMs: renderFinishedAt - renderStartedAt,
        uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
        totalMs: uploadFinishedAt - totalStartedAt,
        htmlLength: html.length,
        pdfSizeBytes: pdfBytes.byteLength,
      },
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] render_failed`, {
      objectName: payload.objectName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      preferPriceStage: payload.preferPriceStage ?? "priced",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    });
    return createDirectorPdfErrorResponse({
      status: 500,
      errorCode: "backend_pdf_failed",
      error: error instanceof Error ? error.message : "Director production report PDF render failed.",
      documentKind: "production_report",
      renderBranch: "backend_production_report_v1",
    });
  }
});
