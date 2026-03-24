import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import { createPdfSource, type PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../supabaseClient";
import {
  normalizeDirectorSubcontractReportPdfRequest,
  type DirectorSubcontractReportPdfRequest,
} from "../pdf/directorSubcontractReport.shared";

const FUNCTION_NAME = "director-subcontract-report-pdf";
const MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_SUBCONTRACT_REPORT_PDF_BACKEND_V1 ??
    process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ??
    "",
)
  .trim()
  .toLowerCase();
const MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(MODE_RAW);
const DIRECT_FUNCTION_URL_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_SUBCONTRACT_REPORT_PDF_FUNCTION_URL ?? "",
).trim();
const DIRECT_FUNCTION_OVERRIDE_STORAGE_KEY = "rik:director-subcontract-report-pdf-function-url";

type DirectorSubcontractReportPdfBackendResponse = {
  renderVersion?: string;
  renderBranch?: string;
  renderer?: string;
  signedUrl?: string;
  bucketId?: string;
  storagePath?: string;
  fileName?: string;
  expiresInSeconds?: number;
  error?: string;
};

type DirectorSubcontractReportPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  renderBranch: "backend_subcontract_report_v1";
  renderVersion: "v1";
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  fileName: string;
  expiresInSeconds: number | null;
};

class DirectorSubcontractReportPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorSubcontractReportPdfBackendError";
  }
}

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const text = String(error ?? "").trim();
  return text || fallback;
};

const shouldUseBackendRollout = () => MODE !== "force_off";

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

function validateResponse(value: unknown): DirectorSubcontractReportPdfBackendResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend returned non-object payload",
    );
  }

  const payload = value as DirectorSubcontractReportPdfBackendResponse;
  const renderVersion = String(payload.renderVersion ?? "").trim();
  const renderBranch = String(payload.renderBranch ?? "").trim();
  const renderer = String(payload.renderer ?? "").trim();
  const signedUrl = String(payload.signedUrl ?? "").trim();
  const bucketId = String(payload.bucketId ?? "").trim();
  const storagePath = String(payload.storagePath ?? "").trim();
  const fileName = String(payload.fileName ?? "").trim();
  const expiresInSeconds = Number(payload.expiresInSeconds ?? NaN);

  if (renderVersion !== "v1") {
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend invalid renderVersion: ${renderVersion || "<empty>"}`,
    );
  }
  if (renderBranch !== "backend_subcontract_report_v1") {
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend invalid renderBranch: ${renderBranch || "<empty>"}`,
    );
  }
  if (renderer !== "browserless_puppeteer" && renderer !== "local_browser_puppeteer") {
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend invalid renderer: ${renderer || "<empty>"}`,
    );
  }
  if (!signedUrl) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend missing signedUrl",
    );
  }
  if (!bucketId || !storagePath || !fileName) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend missing storage metadata",
    );
  }

  return {
    source: createPdfSource(signedUrl),
    bucketId,
    storagePath,
    signedUrl,
    renderBranch: "backend_subcontract_report_v1",
    renderVersion: "v1",
    renderer: renderer as "browserless_puppeteer" | "local_browser_puppeteer",
    fileName,
    expiresInSeconds: Number.isFinite(expiresInSeconds) ? Math.max(0, Math.trunc(expiresInSeconds)) : null,
  };
}

async function invokeViaDirectUrl(
  functionUrl: string,
  payload: DirectorSubcontractReportPdfRequest,
): Promise<DirectorSubcontractReportPdfBackendResult> {
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
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend failed: ${message || `HTTP ${response.status}`}`,
    );
  }
  return validateResponse(body);
}

async function invokeViaSupabaseFunctions(
  payload: DirectorSubcontractReportPdfRequest,
): Promise<DirectorSubcontractReportPdfBackendResult> {
  const { data, error } = await supabase.functions.invoke<DirectorSubcontractReportPdfBackendResponse>(
    FUNCTION_NAME,
    {
      body: payload,
    },
  );

  if (error) {
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend failed: ${toErrorMessage(error, "Unknown edge invoke error")}`,
    );
  }

  if (String(data?.error ?? "").trim()) {
    throw new DirectorSubcontractReportPdfBackendError(
      `director subcontract report pdf backend returned error: ${String(data?.error ?? "").trim()}`,
    );
  }

  return validateResponse(data);
}

export function getDirectorSubcontractReportPdfBackendMode() {
  return MODE;
}

export function setDirectorSubcontractReportPdfFunctionUrlOverrideForDev(functionUrl: string | null) {
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

export async function generateDirectorSubcontractReportPdfViaBackend(
  input: DirectorSubcontractReportPdfRequest,
): Promise<DirectorSubcontractReportPdfBackendResult> {
  if (!shouldUseBackendRollout()) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend rollout is disabled",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend missing Supabase env",
    );
  }

  const payload = normalizeDirectorSubcontractReportPdfRequest(input);
  const directUrl = getDirectFunctionUrlOverride();
  const result = directUrl
    ? await invokeViaDirectUrl(directUrl, payload)
    : await invokeViaSupabaseFunctions(payload);

  if (__DEV__) {
    console.info(
      `[director-subcontract-report-pdf-backend] ${JSON.stringify({
        companyName: payload.companyName ?? null,
        generatedBy: payload.generatedBy ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        objectName: payload.objectName ?? null,
        transport: directUrl ? "direct_url" : "supabase_functions",
        functionName: FUNCTION_NAME,
        renderBranch: result.renderBranch,
        renderVersion: result.renderVersion,
        renderer: result.renderer,
        signedUrl: result.signedUrl,
        bucketId: result.bucketId,
        storagePath: result.storagePath,
      })}`,
    );
  }

  return result;
}
