/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  filterDirectorSupplierSummarySpendRowsByKind,
  normalizeDirectorFinanceSupplierSummaryPdfRequest,
  prepareDirectorSupplierSummaryPdfModelShared,
  renderDirectorSupplierSummaryPdfHtmlShared,
} from "../../../src/lib/pdf/directorSupplierSummary.shared.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "director-finance-supplier-summary-pdf";
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

type FinanceSourceEnvelope = {
  document_type?: string;
  version?: string;
  finance_rows?: unknown[];
  spend_rows?: unknown[];
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
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
      .replace(/^_+|_+$/g, "") || "director_supplier_summary"
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
  return `director/supplier_summary/${yyyy}/${mm}/${dd}/${stamp}_${nonce}_${fileName}`;
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
    throw new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
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
    throw new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const role = cleanText(roleData).toLowerCase();
  if (roleError || role !== "director") {
    throw new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  return {
    userId: userData.user.id,
  };
}

function validateFinanceSourceEnvelope(value: unknown): Required<FinanceSourceEnvelope> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pdf_director_finance_source_v1 returned non-object payload");
  }

  const root = value as FinanceSourceEnvelope;
  if (cleanText(root.document_type) !== "director_finance_report") {
    throw new Error(
      `pdf_director_finance_source_v1 invalid document_type: ${cleanText(root.document_type) || "<empty>"}`,
    );
  }
  if (cleanText(root.version) !== "v1") {
    throw new Error(
      `pdf_director_finance_source_v1 invalid version: ${cleanText(root.version) || "<empty>"}`,
    );
  }
  if (!Array.isArray(root.finance_rows) || !Array.isArray(root.spend_rows)) {
    throw new Error("pdf_director_finance_source_v1 missing rows");
  }

  return {
    document_type: "director_finance_report",
    version: "v1",
    finance_rows: root.finance_rows,
    spend_rows: root.spend_rows,
  };
}

function estimatePayloadSizeBytes(financeRows: unknown[], spendRows: unknown[]) {
  return financeRows.length * 240 + spendRows.length * 180;
}

async function loadSupplierSummarySource(admin: ReturnType<typeof createClient>, payload: ReturnType<typeof normalizeDirectorFinanceSupplierSummaryPdfRequest>) {
  const { data, error } = await admin.rpc("pdf_director_finance_source_v1", {
    p_from: payload.periodFrom ?? null,
    p_to: payload.periodTo ?? null,
    p_due_days: payload.dueDaysDefault ?? 7,
    p_critical_days: payload.criticalDays ?? 14,
  });

  if (error) {
    throw new Error(`pdf_director_finance_source_v1 failed: ${error.message}`);
  }

  return validateFinanceSourceEnvelope(data);
}

function buildFileName(payload: ReturnType<typeof normalizeDirectorFinanceSupplierSummaryPdfRequest>) {
  const parts = [
    "director_supplier_summary",
    payload.supplier,
    payload.kindName ?? "",
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
    return new Response("ok", { headers: corsHeaders });
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
    payload = normalizeDirectorFinanceSupplierSummaryPdfRequest(await request.json());
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
      supplier: payload.supplier,
      kindName: payload.kindName ?? null,
    });
    const fetchStartedAt = Date.now();
    const source = await loadSupplierSummarySource(admin, payload);
    const fetchDurationMs = Date.now() - fetchStartedAt;
    console.info(`[${FUNCTION_NAME}] stage_source_loaded`, {
      financeRows: source.finance_rows.length,
      spendRows: source.spend_rows.length,
      fetchDurationMs,
    });
    const renderStartedAt = Date.now();
    const spendRows = filterDirectorSupplierSummarySpendRowsByKind(source.spend_rows, payload.kindName);
    const model = prepareDirectorSupplierSummaryPdfModelShared({
      supplier: payload.supplier,
      periodFrom: payload.periodFrom,
      periodTo: payload.periodTo,
      financeRows: source.finance_rows,
      spendRows,
    });
    console.info(`[${FUNCTION_NAME}] stage_model_ready`, {
      detailRows: model.detailRows.length,
      kindRows: model.kindRows.length,
    });
    const html = renderDirectorSupplierSummaryPdfHtmlShared(model);
    console.info(`[${FUNCTION_NAME}] stage_html_ready`, {
      htmlLength: html.length,
    });
    const { pdfBytes, renderer } = await renderPdfBytes(html);
    const renderDurationMs = Date.now() - renderStartedAt;
    const telemetry = {
      documentKind: "director_finance_supplier_summary",
      sourceKind: "remote-url",
      fetchSourceName: "pdf_director_finance_source_v1",
      financeRows: source.finance_rows.length,
      spendRows: spendRows.length,
      detailRows: model.detailRows.length,
      kindRows: model.kindRows.length,
      fetchDurationMs,
      renderDurationMs,
      totalDurationMs: Date.now() - totalStartedAt,
      htmlLengthEstimate: html.length,
      payloadSizeEstimate: estimatePayloadSizeBytes(source.finance_rows, spendRows),
      fallbackUsed: false,
      openStrategy: "remote-url",
      materializationStrategy: "viewer_remote",
    } as const;
    console.info(`[${FUNCTION_NAME}] stage_pdf_ready`, {
      renderer,
      sizeBytes: pdfBytes.byteLength,
      renderDurationMs,
    });
    const fileName = buildFileName(payload);
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      fileName,
      bytes: pdfBytes,
    });

    console.info(`[${FUNCTION_NAME}] backend_supplier_summary_v1`, {
      supplier: payload.supplier,
      kindName: payload.kindName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      sizeBytes: pdfBytes.byteLength,
      renderer,
      telemetry,
    });

    return json(200, {
      renderVersion: "v1",
      renderBranch: "backend_supplier_summary_v1",
      renderer,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      expiresInSeconds: uploaded.expiresInSeconds,
      telemetry,
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] render_failed`, {
      supplier: payload.supplier,
      kindName: payload.kindName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    });
    return json(500, {
      error: error instanceof Error ? error.message : "Director finance supplier summary PDF render failed.",
    });
  }
});
