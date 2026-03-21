/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "director-pdf-render";
const DEFAULT_BUCKET = "director_pdf_exports";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

const DOC_KIND_TO_STEM = {
  finance_preview: "director_finance_preview",
  management_report: "director_management_report",
  supplier_summary: "director_supplier_summary",
  production_report: "director_production_report",
  subcontract_report: "director_subcontract_report",
} as const;

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let payload;
  try {
    payload = validatePayload(await request.json());
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid JSON body.",
    });
  }

  const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const browserWsEndpoint = resolveBrowserWsEndpoint();

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase service role env is not configured." });
  }
  if (!browserWsEndpoint) {
    return json(503, { error: "Browserless WebSocket endpoint is not configured." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: browserWsEndpoint,
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(payload.html, {
      waitUntil: "load",
    });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const fileName = normalizePdfFileName(payload.documentKind, payload.fileName);
    const uploaded = await uploadPdfAndSignUrl({
      admin,
      documentKind: payload.documentKind,
      fileName,
      bytes: pdfBytes,
    });

    console.info(`[${FUNCTION_NAME}] edge_render_v1`, {
      documentKind: payload.documentKind,
      documentType: payload.documentType,
      source: payload.source,
      sourceBranch: payload.branchDiagnostics.sourceBranch,
      sourceFallbackReason: payload.branchDiagnostics.sourceFallbackReason,
      htmlLength: payload.html.length,
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      sizeBytes: pdfBytes.byteLength,
    });

    return json(200, {
      renderVersion: "v1",
      renderBranch: "edge_render_v1",
      renderer: "browserless_puppeteer",
      bucketId: uploaded.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      expiresInSeconds: uploaded.expiresInSeconds,
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
    return json(500, {
      error: error instanceof Error ? error.message : "Director PDF render failed.",
    });
  } finally {
    try {
      if (page) await page.close();
    } catch {}
    try {
      if (browser) await browser.close();
    } catch {}
  }
});
