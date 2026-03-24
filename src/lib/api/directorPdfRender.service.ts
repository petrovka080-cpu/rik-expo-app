import { isSupabaseEnvValid, supabase } from "../supabaseClient";
import {
  getPdfRenderRolloutAvailability,
  recordPdfRenderRolloutBranch,
  registerPdfRenderRolloutPath,
  resolvePdfRenderRolloutMode,
  setPdfRenderRolloutAvailability,
  type PdfRenderRolloutBranchMeta,
  type PdfRenderRolloutFallbackReason,
  type PdfRenderRolloutId,
  type PdfRenderRolloutMode,
} from "../documents/pdfRenderRollout";
import { renderPdfHtmlToUri } from "../pdf/pdf.runner";

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

// Keep current local/dev smoke on the proven client render path until the
// backend PDF pilot is explicitly verified. This avoids noisy edge 5xx
// failures in normal Expo/web proof runs without changing production behavior.
const shouldBypassDirectorPdfEdgeInDev = () => __DEV__;

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

type DirectorPdfRenderEdgeResponse = {
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

class DirectorPdfRenderInvokeError extends Error {
  fallbackReason: Extract<PdfRenderRolloutFallbackReason, "function_missing" | "invoke_error" | "invalid_response">;
  disableForSession: boolean;

  constructor(
    message: string,
    options: {
      fallbackReason: Extract<PdfRenderRolloutFallbackReason, "function_missing" | "invoke_error" | "invalid_response">;
      disableForSession?: boolean;
    },
  ) {
    super(message);
    this.name = "DirectorPdfRenderInvokeError";
    this.fallbackReason = options.fallbackReason;
    this.disableForSession = options.disableForSession === true;
  }
}

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const text = String(error ?? "").trim();
  return text || fallback;
};

const shouldDisableDirectorPdfRenderForSession = (error: unknown) => {
  const message = toErrorMessage(error, "").toLowerCase();
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status?: unknown }).status)
      : NaN;

  if (status === 404) return true;
  if (message.includes("404") && message.includes(DIRECTOR_PDF_RENDER_FUNCTION)) return true;
  if (message.includes("function not found")) return true;
  if (message.includes("not found") && message.includes(DIRECTOR_PDF_RENDER_FUNCTION)) return true;
  return false;
};

const validateDirectorPdfRenderResponse = (
  value: unknown,
): DirectorPdfRenderEdgeResponse & {
  renderVersion: "v1";
  renderBranch: "edge_render_v1";
  renderer: "browserless_puppeteer";
  signedUrl: string;
} => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorPdfRenderInvokeError("director-pdf-render returned non-object payload", {
      fallbackReason: "invalid_response",
    });
  }

  const payload = value as DirectorPdfRenderEdgeResponse;
  const renderVersion = String(payload.renderVersion ?? "").trim();
  const renderBranch = String(payload.renderBranch ?? "").trim();
  const renderer = String(payload.renderer ?? "").trim();
  const signedUrl = String(payload.signedUrl ?? "").trim();

  if (renderVersion !== "v1") {
    throw new DirectorPdfRenderInvokeError(
      `director-pdf-render invalid renderVersion: ${renderVersion || "<empty>"}`,
      { fallbackReason: "invalid_response" },
    );
  }
  if (renderBranch !== "edge_render_v1") {
    throw new DirectorPdfRenderInvokeError(
      `director-pdf-render invalid renderBranch: ${renderBranch || "<empty>"}`,
      { fallbackReason: "invalid_response" },
    );
  }
  if (renderer !== "browserless_puppeteer") {
    throw new DirectorPdfRenderInvokeError(
      `director-pdf-render invalid renderer: ${renderer || "<empty>"}`,
      { fallbackReason: "invalid_response" },
    );
  }
  if (!signedUrl) {
    throw new DirectorPdfRenderInvokeError("director-pdf-render missing signedUrl", {
      fallbackReason: "invalid_response",
    });
  }

  return {
    ...payload,
    renderVersion: "v1",
    renderBranch: "edge_render_v1",
    renderer: "browserless_puppeteer",
    signedUrl,
  };
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

async function renderDirectorPdfViaEdge(args: DirectorPdfRenderArgs): Promise<string> {
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

  const { data, error } = await supabase.functions.invoke<DirectorPdfRenderEdgeResponse>(
    DIRECTOR_PDF_RENDER_FUNCTION,
    {
      body: payload,
    },
  );

  if (error) {
    throw new DirectorPdfRenderInvokeError(
      `director-pdf-render failed: ${toErrorMessage(error, "Unknown edge invoke error")}`,
      {
        fallbackReason: shouldDisableDirectorPdfRenderForSession(error)
          ? "function_missing"
          : "invoke_error",
        disableForSession: shouldDisableDirectorPdfRenderForSession(error),
      },
    );
  }

  if (String(data?.error ?? "").trim()) {
    throw new DirectorPdfRenderInvokeError(
      `director-pdf-render returned error: ${String(data?.error ?? "").trim()}`,
      {
        fallbackReason: "invoke_error",
      },
    );
  }

  const valid = validateDirectorPdfRenderResponse(data);
  return valid.signedUrl;
}

async function renderDirectorPdfViaClientFallback(
  args: DirectorPdfRenderArgs,
  fallbackReason: PdfRenderRolloutFallbackReason,
  error?: unknown,
): Promise<string> {
  const uri = await renderPdfHtmlToUri({
    html: args.html,
    documentType: args.documentType,
    source: args.source,
  });
  logDirectorPdfRenderBranch(
    args.documentKind,
    args.source,
    {
      renderBranch: "client_legacy_render",
      fallbackReason,
      renderVersion: "v1",
    },
    {
      sourceBranch: args.sourceBranch ?? null,
      sourceFallbackReason: args.sourceFallbackReason ?? null,
      htmlLength: args.html.length,
      errorMessage: error ? toErrorMessage(error, "") : null,
    },
  );
  return uri;
}

export async function renderDirectorPdf(args: DirectorPdfRenderArgs): Promise<string> {
  if (shouldBypassDirectorPdfEdgeInDev()) {
    return renderDirectorPdfViaClientFallback(args, "disabled");
  }

  if (DIRECTOR_PDF_RENDER_MODE === "force_off") {
    return renderDirectorPdfViaClientFallback(args, "disabled");
  }

  if (!isSupabaseEnvValid) {
    return renderDirectorPdfViaClientFallback(args, "missing_env");
  }

  if (
    DIRECTOR_PDF_RENDER_MODE === "auto" &&
    getPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID) === "missing"
  ) {
    return renderDirectorPdfViaClientFallback(args, "disabled");
  }

  try {
    const signedUrl = await renderDirectorPdfViaEdge(args);
    if (DIRECTOR_PDF_RENDER_MODE === "auto") {
      setPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID, "available");
    }
    logDirectorPdfRenderBranch(
      args.documentKind,
      args.source,
      {
        renderBranch: "edge_render_v1",
        renderVersion: "v1",
        renderer: "browserless_puppeteer",
      },
      {
        sourceBranch: args.sourceBranch ?? null,
        sourceFallbackReason: args.sourceFallbackReason ?? null,
        htmlLength: args.html.length,
      },
    );
    return signedUrl;
  } catch (error) {
    const fallbackReason =
      error instanceof DirectorPdfRenderInvokeError ? error.fallbackReason : "invoke_error";
    if (
      DIRECTOR_PDF_RENDER_MODE === "auto" &&
      error instanceof DirectorPdfRenderInvokeError &&
      error.disableForSession
    ) {
      setPdfRenderRolloutAvailability(DIRECTOR_PDF_RENDER_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[director-pdf-render] edge_render_v1 fallback", {
        documentKind: args.documentKind,
        source: args.source,
        fallbackReason,
        renderMode: DIRECTOR_PDF_RENDER_MODE,
        errorMessage: toErrorMessage(error, "Unknown render error"),
      });
    }
    return renderDirectorPdfViaClientFallback(args, fallbackReason, error);
  }
}
