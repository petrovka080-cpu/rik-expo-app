/* eslint-disable import/no-unresolved */
// @ts-nocheck

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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

export function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function sanitizeStem(value: string, fallback: string) {
  return (
    cleanText(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback
  );
}

export function normalizePdfFileName(stem: string, fallback: string) {
  const normalized = sanitizeStem(stem.replace(/\.pdf$/i, ""), fallback);
  return `${normalized}.pdf`;
}

const PDF_DOC_LABELS: Record<string, string> = {
  request: "request",
  proposal: "proposal",
  payment_order: "payment_order",
  director_report: "director_report",
  report_export: "report_export",
  supplier_summary: "supplier_summary",
  warehouse_register: "warehouse_register",
  warehouse_materials: "warehouse_materials",
  warehouse_document: "warehouse_document",
  contractor_act: "contractor_act",
  attachment_pdf: "attachment",
};

export function buildCanonicalPdfFileName(args: {
  documentType: string;
  title?: string | null;
  entityId?: string | number | null;
  dateIso?: string | null;
}) {
  const typeLabel = PDF_DOC_LABELS[String(args.documentType || "").trim()] || "document";
  const titlePart = String(args.title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const entityPart = String(args.entityId ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  const datePart = String(args.dateIso || "").trim().slice(0, 10);
  const stem = [typeLabel, titlePart, datePart, entityPart].filter(Boolean).join("_");
  return normalizePdfFileName(stem, typeLabel);
}

export function buildStoragePath(scope: string, fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const nonce = crypto.randomUUID().slice(0, 8);
  return `${scope}/${yyyy}/${mm}/${dd}/${stamp}_${nonce}_${fileName}`;
}

export function resolveSignedUrlTtlSeconds() {
  const raw = Number(
    Deno.env.get("CANONICAL_PDF_RENDER_SIGNED_URL_TTL_SECONDS") ??
      Deno.env.get("DIRECTOR_PDF_RENDER_SIGNED_URL_TTL_SECONDS") ??
      NaN,
  );
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SIGNED_URL_TTL_SECONDS;
  return Math.floor(raw);
}

function resolveBrowserWsEndpoint() {
  const explicit = cleanText(
    Deno.env.get("CANONICAL_PDF_BROWSERLESS_WS_ENDPOINT") ??
      Deno.env.get("DIRECTOR_PDF_BROWSERLESS_WS_ENDPOINT"),
  );
  if (explicit) return explicit;

  const browserlessToken = cleanText(Deno.env.get("PUPPETEER_BROWSERLESS_IO_KEY"));
  if (browserlessToken) {
    return `wss://chrome.browserless.io?token=${encodeURIComponent(browserlessToken)}`;
  }

  return "";
}

function resolveBrowserUrl() {
  return cleanText(
    Deno.env.get("CANONICAL_PDF_BROWSER_URL") ?? Deno.env.get("DIRECTOR_PDF_BROWSER_URL"),
  );
}

async function resolveLocalBrowserExecutable() {
  const explicit = cleanText(
    Deno.env.get("CANONICAL_PDF_LOCAL_BROWSER_EXECUTABLE") ??
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

export async function renderPdfBytes(html: string) {
  const browserWsEndpoint = resolveBrowserWsEndpoint();
  const browserUrl = browserWsEndpoint ? "" : resolveBrowserUrl();
  const executablePath = await resolveLocalBrowserExecutable();

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
    } else {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    if (!browser) {
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
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function uploadCanonicalPdf(args: {
  admin: any;
  bucketId: string;
  storagePath: string;
  bytes: Uint8Array;
  ttlSeconds: number;
}) {
  const upload = await args.admin.storage.from(args.bucketId).upload(args.storagePath, args.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    throw new Error(`storage upload failed: ${upload.error.message}`);
  }

  const signed = await args.admin.storage
    .from(args.bucketId)
    .createSignedUrl(args.storagePath, args.ttlSeconds);
  if (signed.error) {
    throw new Error(`createSignedUrl failed: ${signed.error.message}`);
  }

  const signedUrl = cleanText(signed.data?.signedUrl);
  if (!signedUrl) {
    throw new Error("storage signedUrl is empty");
  }

  return {
    storagePath: args.storagePath,
    signedUrl,
  };
}
