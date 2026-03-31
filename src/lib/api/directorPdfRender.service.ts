import { isSupabaseEnvValid } from "../supabaseClient";
import {
  getPdfRenderRolloutAvailability,
  recordPdfRenderRolloutBranch,
  registerPdfRenderRolloutPath,
  resolvePdfRenderRolloutMode,
  setPdfRenderRolloutAvailability,
  type PdfRenderRolloutBranchMeta,
  type PdfRenderRolloutId,
  type PdfRenderRolloutMode,
} from "../documents/pdfRenderRollout";
import { invokeDirectorPdfBackend } from "./directorPdfBackendInvoker";

const DIRECTOR_PDF_RENDER_OFFLOAD_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ?? "",
)
  .trim()
  .toLowerCase();

const DIRECTOR_PDF_RENDER_ROLLOUT_ID: PdfRenderRolloutId = "director_render_v1";
const DIRECTOR_PDF_RENDER_MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(
  DIRECTOR_PDF_RENDER_OFFLOAD_V1_MODE_RAW,
);
const DIRECTOR_PDF_RENDER_FUNCTION = "director-pdf-render";

registerPdfRenderRolloutPath(DIRECTOR_PDF_RENDER_ROLLOUT_ID, DIRECTOR_PDF_RENDER_MODE);

export type DirectorPdfRenderDocumentKind =
  | "finance_preview"
  | "management_report"
  | "supplier_summary"
  | "production_report"
  | "subcontract_report";

type DirectorPdfRenderArgs = {
  documentKind: DirectorPdfRenderDocumentKind;
  documentType: "director_report" | "supplier_summary";
  html: string;
  source: string;
  sourceBranch?: string | null;
  sourceFallbackReason?: string | null;
};

type DirectorPdfRenderInvokePayload = {
  version: "v1";
  documentKind: DirectorPdfRenderDocumentKind;
  documentType: "director_report" | "supplier_summary";
  html: string;
  source: string;
  branchDiagnostics: {
    sourceBranch: string | null;
    sourceFallbackReason: string | null;
  };
};

type DirectorPdfRenderEdgeResult = {
  signedUrl: string;
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const text = String(error ?? "").trim();
  return text || fallback;
};

const shouldDisableDirectorPdfRenderForSession = (error: unknown) => {
  const message = toErrorMessage(error, "").toLowerCase();
  const status =
    error && typeof error === "object" && "httpStatus" in error
      ? Number((error as { httpStatus?: unknown }).httpStatus)
      : NaN;

  if (status === 404) return true;
  if (message.includes("404") && message.includes(DIRECTOR_PDF_RENDER_FUNCTION)) return true;
  if (message.includes("function not found")) return true;
  if (message.includes("not found") && message.includes(DIRECTOR_PDF_RENDER_FUNCTION)) return true;
  return false;
};

const logDirectorPdfRenderBranch = (
  documentKind: DirectorPdfRenderDocumentKind,
  source: string,
  branchMeta: PdfRenderRolloutBranchMeta,
  extra?: Record<string, unknown>,
) => {
  recordPdfRenderRolloutBranch(DIRECTOR_PDF_RENDER_ROLLOUT_ID, {
    documentKind,
    branchMeta,
  });
  if (!__DEV__) return;
  console.info("[director-pdf-render]", {
    documentKind,
    source,
    renderBranch: branchMeta.renderBranch,
    fallbackReason: branchMeta.fallbackReason ?? null,
    renderVersion: branchMeta.renderVersion ?? null,
    renderer: branchMeta.renderer ?? null,
    ...extra,
  });
};

async function renderDirectorPdfViaEdge(args: DirectorPdfRenderArgs): Promise<DirectorPdfRenderEdgeResult> {
  const payload: DirectorPdfRenderInvokePayload = {
    version: "v1",
    documentKind: args.documentKind,
    documentType: args.documentType,
    html: args.html,
    source: args.source,
    branchDiagnostics: {
      sourceBranch: args.sourceBranch ?? null,
      sourceFallbackReason: args.sourceFallbackReason ?? null,
    },
  };

  const result = await invokeDirectorPdfBackend({
    functionName: DIRECTOR_PDF_RENDER_FUNCTION,
    payload,
    expectedDocumentKind: args.documentKind,
    expectedRenderBranch: "edge_render_v1",
    allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
    errorPrefix: "director-pdf-render failed",
  });

  return {
    signedUrl: result.signedUrl,
    renderer: result.renderer,
  };
}

export async function renderDirectorPdf(args: DirectorPdfRenderArgs): Promise<string> {
  if (DIRECTOR_PDF_RENDER_MODE === "force_off") {
    throw new Error("director-pdf-render is force_off and no legacy fallback is allowed");
  }

  if (!isSupabaseEnvValid) {
    throw new Error("director-pdf-render missing Supabase env");
  }

  if (
    DIRECTOR_PDF_RENDER_MODE === "auto" &&
    getPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID) === "missing"
  ) {
    throw new Error("director-pdf-render unavailable in this session and no legacy fallback is allowed");
  }

  try {
    const renderResult = await renderDirectorPdfViaEdge(args);
    if (DIRECTOR_PDF_RENDER_MODE === "auto") {
      setPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID, "available");
    }
    logDirectorPdfRenderBranch(
      args.documentKind,
      args.source,
      {
        renderBranch: "edge_render_v1",
        renderVersion: "v1",
        renderer: renderResult.renderer,
      },
      {
        sourceBranch: args.sourceBranch ?? null,
        sourceFallbackReason: args.sourceFallbackReason ?? null,
        htmlLength: args.html.length,
      },
    );
    return renderResult.signedUrl;
  } catch (error) {
    if (DIRECTOR_PDF_RENDER_MODE === "auto" && shouldDisableDirectorPdfRenderForSession(error)) {
      setPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID, "missing", {
        errorMessage: toErrorMessage(error, "director-pdf-render failed"),
      });
    }
    if (__DEV__) {
      console.warn("[director-pdf-render] edge_render_v1 failed", {
        documentKind: args.documentKind,
        source: args.source,
        renderMode: DIRECTOR_PDF_RENDER_MODE,
        errorMessage: toErrorMessage(error, "Unknown render error"),
      });
    }
    throw error instanceof Error ? error : new Error(toErrorMessage(error, "director-pdf-render failed"));
  }
}
