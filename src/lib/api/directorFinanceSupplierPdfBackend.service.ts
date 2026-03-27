import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import { createPdfSource, type PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../supabaseClient";
import {
  normalizeDirectorFinanceSupplierSummaryPdfRequest,
  type DirectorFinanceSupplierSummaryPdfRequest,
} from "../pdf/directorSupplierSummary.shared";

const FUNCTION_NAME = "director-finance-supplier-summary-pdf";
const MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_FINANCE_SUPPLIER_PDF_BACKEND_V1 ??
    process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ??
    "",
)
  .trim()
  .toLowerCase();
const MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(MODE_RAW);
const DIRECT_FUNCTION_URL_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_FINANCE_SUPPLIER_PDF_FUNCTION_URL ?? "",
).trim();
const DIRECT_FUNCTION_OVERRIDE_STORAGE_KEY = "rik:director-finance-supplier-pdf-function-url";

type DirectorFinanceSupplierPdfBackendResponse = {
  renderVersion?: string;
  renderBranch?: string;
  renderer?: string;
  signedUrl?: string;
  bucketId?: string;
  storagePath?: string;
  fileName?: string;
  expiresInSeconds?: number;
  telemetry?: {
    documentKind?: string;
    sourceKind?: string;
    fetchSourceName?: string;
    financeRows?: number;
    spendRows?: number;
    detailRows?: number;
    kindRows?: number;
    fetchDurationMs?: number;
    renderDurationMs?: number;
    totalDurationMs?: number;
    htmlLengthEstimate?: number;
    payloadSizeEstimate?: number;
    fallbackUsed?: boolean;
    openStrategy?: string;
    materializationStrategy?: string;
  } | null;
  error?: string;
};

export type DirectorFinanceSupplierPdfBackendTelemetry = {
  documentKind: "director_finance_supplier_summary";
  sourceKind: "remote-url";
  fetchSourceName: "pdf_director_finance_source_v1";
  financeRows: number;
  spendRows: number;
  detailRows: number;
  kindRows: number;
  fetchDurationMs: number | null;
  renderDurationMs: number | null;
  totalDurationMs: number | null;
  htmlLengthEstimate: number | null;
  payloadSizeEstimate: number | null;
  fallbackUsed: false;
  openStrategy: "remote-url";
  materializationStrategy: "viewer_remote";
};

type DirectorFinanceSupplierPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  renderBranch: "backend_supplier_summary_v1";
  renderVersion: "v1";
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  fileName: string;
  expiresInSeconds: number | null;
  telemetry: DirectorFinanceSupplierPdfBackendTelemetry | null;
};

class DirectorFinanceSupplierPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorFinanceSupplierPdfBackendError";
  }
}

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const text = String(error ?? "").trim();
  return text || fallback;
};

const shouldUseBackendPilot = () => MODE !== "force_off";

const isBrowserRuntime =
  typeof window !== "undefined" && typeof document !== "undefined";

function getDirectFunctionUrlOverride() {
  if (DIRECT_FUNCTION_URL_RAW) return DIRECT_FUNCTION_URL_RAW;
  if (!__DEV__) return "";
  try {
    if (!isBrowserRuntime) return "";
    const fromStorage = window.localStorage.getItem(DIRECT_FUNCTION_OVERRIDE_STORAGE_KEY);
    return String(fromStorage ?? "").trim();
  } catch {
    return "";
  }
}

function validateResponse(value: unknown): DirectorFinanceSupplierPdfBackendResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend returned non-object payload",
    );
  }

  const payload = value as DirectorFinanceSupplierPdfBackendResponse;
  const renderVersion = String(payload.renderVersion ?? "").trim();
  const renderBranch = String(payload.renderBranch ?? "").trim();
  const renderer = String(payload.renderer ?? "").trim();
  const signedUrl = String(payload.signedUrl ?? "").trim();
  const bucketId = String(payload.bucketId ?? "").trim();
  const storagePath = String(payload.storagePath ?? "").trim();
  const fileName = String(payload.fileName ?? "").trim();
  const expiresInSeconds = Number(payload.expiresInSeconds ?? NaN);
  const telemetry = payload.telemetry;

  if (renderVersion !== "v1") {
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend invalid renderVersion: ${renderVersion || "<empty>"}`,
    );
  }
  if (renderBranch !== "backend_supplier_summary_v1") {
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend invalid renderBranch: ${renderBranch || "<empty>"}`,
    );
  }
  if (renderer !== "browserless_puppeteer" && renderer !== "local_browser_puppeteer") {
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend invalid renderer: ${renderer || "<empty>"}`,
    );
  }
  if (!signedUrl) {
    throw new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend missing signedUrl",
    );
  }
  if (!bucketId || !storagePath || !fileName) {
    throw new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend missing storage metadata",
    );
  }

  return {
    source: createPdfSource(signedUrl),
    bucketId,
    storagePath,
    signedUrl,
    renderBranch: "backend_supplier_summary_v1",
    renderVersion: "v1",
    renderer: renderer as "browserless_puppeteer" | "local_browser_puppeteer",
    fileName,
    expiresInSeconds: Number.isFinite(expiresInSeconds) ? Math.max(0, Math.trunc(expiresInSeconds)) : null,
    telemetry:
      telemetry &&
      String(telemetry.documentKind ?? "").trim() === "director_finance_supplier_summary" &&
      String(telemetry.sourceKind ?? "").trim() === "remote-url"
        ? {
            documentKind: "director_finance_supplier_summary",
            sourceKind: "remote-url",
            fetchSourceName: "pdf_director_finance_source_v1",
            financeRows: Number.isFinite(Number(telemetry.financeRows)) ? Math.max(0, Math.trunc(Number(telemetry.financeRows))) : 0,
            spendRows: Number.isFinite(Number(telemetry.spendRows)) ? Math.max(0, Math.trunc(Number(telemetry.spendRows))) : 0,
            detailRows: Number.isFinite(Number(telemetry.detailRows)) ? Math.max(0, Math.trunc(Number(telemetry.detailRows))) : 0,
            kindRows: Number.isFinite(Number(telemetry.kindRows)) ? Math.max(0, Math.trunc(Number(telemetry.kindRows))) : 0,
            fetchDurationMs: Number.isFinite(Number(telemetry.fetchDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.fetchDurationMs)))
              : null,
            renderDurationMs: Number.isFinite(Number(telemetry.renderDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.renderDurationMs)))
              : null,
            totalDurationMs: Number.isFinite(Number(telemetry.totalDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.totalDurationMs)))
              : null,
            htmlLengthEstimate: Number.isFinite(Number(telemetry.htmlLengthEstimate))
              ? Math.max(0, Math.trunc(Number(telemetry.htmlLengthEstimate)))
              : null,
            payloadSizeEstimate: Number.isFinite(Number(telemetry.payloadSizeEstimate))
              ? Math.max(0, Math.trunc(Number(telemetry.payloadSizeEstimate)))
              : null,
            fallbackUsed: false,
            openStrategy: "remote-url",
            materializationStrategy: "viewer_remote",
          }
        : null,
  };
}

async function invokeViaDirectUrl(
  functionUrl: string,
  payload: DirectorFinanceSupplierSummaryPdfRequest,
): Promise<DirectorFinanceSupplierPdfBackendResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SUPABASE_ANON_KEY) headers.apikey = SUPABASE_ANON_KEY;

  try {
    const { data } = await supabase.auth.getSession();
    const token = String(data?.session?.access_token ?? "").trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }
  } catch {
    if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(
      (body && typeof body === "object" && "error" in body ? (body as { error?: unknown }).error : "") ?? "",
    ).trim();
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend failed: ${message || `HTTP ${response.status}`}`,
    );
  }
  return validateResponse(body);
}

async function invokeViaSupabaseFunctions(
  payload: DirectorFinanceSupplierSummaryPdfRequest,
): Promise<DirectorFinanceSupplierPdfBackendResult> {
  const { data, error } = await supabase.functions.invoke<DirectorFinanceSupplierPdfBackendResponse>(
    FUNCTION_NAME,
    {
      body: payload,
    },
  );

  if (error) {
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend failed: ${toErrorMessage(error, "Unknown edge invoke error")}`,
    );
  }

  if (String(data?.error ?? "").trim()) {
    throw new DirectorFinanceSupplierPdfBackendError(
      `director finance supplier pdf backend returned error: ${String(data?.error ?? "").trim()}`,
    );
  }

  return validateResponse(data);
}

export function getDirectorFinanceSupplierPdfBackendMode() {
  return MODE;
}

export function setDirectorFinanceSupplierPdfFunctionUrlOverrideForDev(functionUrl: string | null) {
  if (!__DEV__ || !isBrowserRuntime) return;
  try {
    const value = String(functionUrl ?? "").trim();
    if (value) {
      window.localStorage.setItem(DIRECT_FUNCTION_OVERRIDE_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(DIRECT_FUNCTION_OVERRIDE_STORAGE_KEY);
    }
  } catch {}
}

export async function generateDirectorFinanceSupplierSummaryPdfViaBackend(
  input: DirectorFinanceSupplierSummaryPdfRequest,
): Promise<DirectorFinanceSupplierPdfBackendResult> {
  if (!shouldUseBackendPilot()) {
    throw new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend pilot is disabled",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend missing Supabase env",
    );
  }

  const payload = normalizeDirectorFinanceSupplierSummaryPdfRequest(input);
  const directUrl = getDirectFunctionUrlOverride();
  const result = directUrl
    ? await invokeViaDirectUrl(directUrl, payload)
    : await invokeViaSupabaseFunctions(payload);

  if (__DEV__) {
    console.info(
      `[director-finance-supplier-pdf-backend] ${JSON.stringify({
        supplier: payload.supplier,
        kindName: payload.kindName ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        transport: directUrl ? "direct_url" : "supabase_functions",
        functionName: FUNCTION_NAME,
        renderBranch: result.renderBranch,
        renderVersion: result.renderVersion,
        renderer: result.renderer,
        signedUrl: result.signedUrl,
        bucketId: result.bucketId,
        storagePath: result.storagePath,
        telemetry: result.telemetry,
      })}`,
    );
  }

  return result;
}
