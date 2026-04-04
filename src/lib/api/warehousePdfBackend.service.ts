import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  normalizeWarehousePdfRequest,
  type WarehousePdfRequest,
} from "../pdf/warehousePdf.shared";
import { invokeCanonicalPdfBackend } from "./canonicalPdfBackendInvoker";

const FUNCTION_NAME = "warehouse-pdf";
const RENDER_BRANCH = "backend_warehouse_pdf_v1";

export type WarehousePdfBackendResult = {
  source: Awaited<ReturnType<typeof invokeCanonicalPdfBackend>>["source"];
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  fileName: string;
  mimeType: "application/pdf";
  generatedAt: string;
  version: "v1";
  renderBranch: typeof RENDER_BRANCH;
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  sourceKind: "remote-url";
  telemetry: Record<string, unknown> | null;
};

export async function generateWarehousePdfViaBackend(
  input: WarehousePdfRequest,
): Promise<WarehousePdfBackendResult> {
  const payload = normalizeWarehousePdfRequest(input);
  const boundary = beginCanonicalPdfBoundary({
    screen: "warehouse",
    surface: "warehouse_pdf_backend",
    role: "warehouse",
    documentType: payload.documentType,
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      documentKind: payload.documentKind,
      issueId: "issueId" in payload ? payload.issueId : null,
      incomingId: "incomingId" in payload ? payload.incomingId : null,
      periodFrom: "periodFrom" in payload ? payload.periodFrom ?? null : null,
      periodTo: "periodTo" in payload ? payload.periodTo ?? null : null,
      dayLabel: "dayLabel" in payload ? payload.dayLabel ?? null : null,
      objectId: "objectId" in payload ? payload.objectId ?? null : null,
    },
  });

  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: payload.documentKind,
    },
  });

  try {
    const result = await invokeCanonicalPdfBackend({
      functionName: FUNCTION_NAME,
      payload,
      expectedRole: "warehouse",
      expectedDocumentType: payload.documentType,
      expectedRenderBranch: RENDER_BRANCH,
      errorPrefix: "warehouse pdf backend failed",
    });

    boundary.success("backend_invoke_success", {
      sourceKind: result.sourceKind,
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: payload.documentKind,
        renderer: result.renderer,
      },
    });
    boundary.success("pdf_storage_uploaded", {
      sourceKind: result.sourceKind,
      extra: {
        bucketId: result.bucketId,
        storagePath: result.storagePath,
      },
    });
    boundary.success("signed_url_received", {
      sourceKind: result.sourceKind,
      extra: {
        documentKind: payload.documentKind,
        fileName: result.fileName,
      },
    });

    return {
      source: result.source,
      bucketId: result.bucketId,
      storagePath: result.storagePath,
      signedUrl: result.signedUrl,
      fileName: result.fileName,
      mimeType: result.mimeType,
      generatedAt: result.generatedAt,
      version: result.version,
      renderBranch: RENDER_BRANCH,
      renderer: result.renderer,
      sourceKind: result.sourceKind,
      telemetry: result.telemetry,
    };
  } catch (error) {
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: payload.documentKind,
      },
    });
    throw error instanceof Error
      ? error
      : new Error("warehouse pdf backend failed");
  }
}
