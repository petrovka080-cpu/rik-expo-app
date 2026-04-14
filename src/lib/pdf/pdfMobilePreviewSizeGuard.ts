/**
 * pdfMobilePreviewSizeGuard — Owner-boundary size guard for the iOS
 * in-app PDF viewer path.
 *
 * Prevents oversized PDFs from being pushed into the mobile viewer route,
 * which can cause blank screens, stuck busy states, or native crashes.
 *
 * This is the SINGLE size guard for the viewer path. Screen files must NOT
 * check size themselves — they call prepareAndPreviewPdfDocument, which
 * calls previewPdfDocument, which calls this guard.
 *
 * The attachmentOpener already has its own `assertIosSizeGuard` for the
 * native share/preview path. This guard covers the /pdf-viewer route path.
 */
import { Platform } from "react-native";

import { IosPdfOversizeError, IOS_PDF_SHARE_SIZE_LIMIT } from "../documents/attachmentOpener";
import { recordPlatformObservability } from "../observability/platformObservability";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum file size (in bytes) for the iOS in-app PDF viewer.
 * Re-uses the same 15 MB limit as the attachmentOpener share guard,
 * since the underlying native rendering constraints are the same.
 */
export const IOS_PDF_PREVIEW_MAX_BYTES = IOS_PDF_SHARE_SIZE_LIMIT;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PdfPreviewSizeGuardResult =
  | { eligible: true }
  | { eligible: false; reason: "oversized_pdf"; sizeBytes: number; limitBytes: number };

export type PdfPreviewSizeGuardInput = {
  platform: typeof Platform.OS;
  sizeBytes: number | null | undefined;
  documentType?: string | null;
  originModule?: string | null;
  fileName?: string | null;
};

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Checks whether a PDF is eligible for the iOS in-app viewer.
 *
 * - On non-iOS platforms: always eligible.
 * - If sizeBytes is unknown (null/undefined): allow through (don't block legitimate files).
 * - If sizeBytes <= IOS_PDF_PREVIEW_MAX_BYTES: eligible.
 * - If sizeBytes > IOS_PDF_PREVIEW_MAX_BYTES: blocked.
 *
 * This is a pure function — it does NOT show alerts or throw.
 * The caller decides what to do with the result.
 */
export function checkPdfMobilePreviewEligibility(
  input: PdfPreviewSizeGuardInput,
): PdfPreviewSizeGuardResult {
  if (input.platform !== "ios") return { eligible: true };

  const size = input.sizeBytes;
  if (size === null || size === undefined || !Number.isFinite(size)) {
    return { eligible: true };
  }

  if (size <= IOS_PDF_PREVIEW_MAX_BYTES) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: "oversized_pdf",
    sizeBytes: size,
    limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
  };
}

// ---------------------------------------------------------------------------
// Observability + Error factory
// ---------------------------------------------------------------------------

/**
 * Records the observability event for a blocked oversized PDF open
 * and returns an IosPdfOversizeError for the caller to throw.
 *
 * The caller is responsible for:
 *  - clearing busy state
 *  - showing an Alert (or letting the error bubble to a catch that does)
 */
export function recordPdfPreviewOversizeBlocked(input: {
  sizeBytes: number;
  limitBytes: number;
  documentType?: string | null;
  originModule?: string | null;
  fileName?: string | null;
}): IosPdfOversizeError {
  recordPlatformObservability({
    screen: "request",
    surface: "pdf_open_family",
    category: "ui",
    event: "ios_pdf_viewer_oversize_blocked",
    result: "error",
    sourceKind: "pdf:ios_preview_size_guard",
    errorStage: "ios_oversize",
    errorClass: "IosPdfOversizeError",
    errorMessage: `size=${input.sizeBytes} limit=${input.limitBytes} action=preview`,
    extra: {
      platform: "ios",
      sizeBytes: input.sizeBytes,
      limitBytes: input.limitBytes,
      documentType: input.documentType ?? null,
      originModule: input.originModule ?? null,
      fileName: input.fileName ?? null,
      blockedReason: "oversized_pdf",
    },
  });

  return new IosPdfOversizeError(input.sizeBytes, input.limitBytes, "preview");
}
