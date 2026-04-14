/**
 * N1: iOS PDF Mobile Preview Size Guard — focused regression tests.
 *
 * Validates:
 * 1. Below threshold → eligible
 * 2. Exact threshold → eligible (inclusive)
 * 3. Above threshold → blocked
 * 4. Unknown size → eligible (don't block legitimate files)
 * 5. Android → always eligible regardless of size
 * 6. Web → always eligible regardless of size
 * 7. Blocked result carries correct metadata
 * 8. No duplicate side effects (pure function)
 * 9. Observability emitted on blocked path
 * 10. Busy cleared is the caller's responsibility (tested via error throw)
 */
import {
  checkPdfMobilePreviewEligibility,
  IOS_PDF_PREVIEW_MAX_BYTES,
  recordPdfPreviewOversizeBlocked,
} from "../../src/lib/pdf/pdfMobilePreviewSizeGuard";
import { IosPdfOversizeError } from "../../src/lib/documents/attachmentOpener";

const mockRecordPlatformObservability = jest.fn();

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

describe("iOS PDF mobile preview size guard", () => {
  beforeEach(() => {
    mockRecordPlatformObservability.mockReset();
  });

  describe("checkPdfMobilePreviewEligibility", () => {
    // 1. Below threshold → eligible
    it("allows files below the threshold on iOS", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 1_000_000,
      });
      expect(result.eligible).toBe(true);
    });

    it("allows 1MB files on iOS", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 1 * 1024 * 1024,
      });
      expect(result.eligible).toBe(true);
    });

    it("allows 10MB files on iOS", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 10 * 1024 * 1024,
      });
      expect(result.eligible).toBe(true);
    });

    // 2. Exact threshold → eligible (inclusive)
    it("allows files at exactly the threshold (inclusive)", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: IOS_PDF_PREVIEW_MAX_BYTES,
      });
      expect(result.eligible).toBe(true);
    });

    // 3. Above threshold → blocked
    it("blocks files 1 byte over the threshold", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: IOS_PDF_PREVIEW_MAX_BYTES + 1,
      });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        const blocked = result as { eligible: false; reason: string; sizeBytes: number; limitBytes: number };
        expect(blocked.reason).toBe("oversized_pdf");
        expect(blocked.sizeBytes).toBe(IOS_PDF_PREVIEW_MAX_BYTES + 1);
        expect(blocked.limitBytes).toBe(IOS_PDF_PREVIEW_MAX_BYTES);
      }
    });

    it("blocks 20MB files on iOS", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 20 * 1024 * 1024,
      });
      expect(result.eligible).toBe(false);
    });

    it("blocks 50MB files on iOS", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 50 * 1024 * 1024,
      });
      expect(result.eligible).toBe(false);
    });

    // 4. Unknown size → eligible
    it("allows null size through (unknown = allow)", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: null,
      });
      expect(result.eligible).toBe(true);
    });

    it("allows undefined size through", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: undefined,
      });
      expect(result.eligible).toBe(true);
    });

    it("allows NaN size through", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: NaN,
      });
      expect(result.eligible).toBe(true);
    });

    it("allows zero-byte files through", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 0,
      });
      expect(result.eligible).toBe(true);
    });

    // 5. Android → always eligible
    it("allows oversized files on Android", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "android",
        sizeBytes: 100 * 1024 * 1024,
      });
      expect(result.eligible).toBe(true);
    });

    // 6. Web → always eligible
    it("allows oversized files on web", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "web",
        sizeBytes: 100 * 1024 * 1024,
      });
      expect(result.eligible).toBe(true);
    });

    // 7. Blocked result carries correct metadata
    it("blocked result carries sizeBytes, limitBytes, and reason", () => {
      const result = checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 20_000_000,
        documentType: "request",
        originModule: "foreman",
        fileName: "test.pdf",
      });
      expect(result).toEqual({
        eligible: false,
        reason: "oversized_pdf",
        sizeBytes: 20_000_000,
        limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
      });
    });

    // 8. No side effects (pure function — no observability calls)
    it("does not record observability events (pure check)", () => {
      checkPdfMobilePreviewEligibility({
        platform: "ios",
        sizeBytes: 20_000_000,
      });
      expect(mockRecordPlatformObservability).not.toHaveBeenCalled();
    });
  });

  describe("recordPdfPreviewOversizeBlocked", () => {
    // 9. Observability emitted
    it("records observability event with correct metadata", () => {
      recordPdfPreviewOversizeBlocked({
        sizeBytes: 20_000_000,
        limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
        documentType: "request",
        originModule: "foreman",
        fileName: "big-file.pdf",
      });

      expect(mockRecordPlatformObservability).toHaveBeenCalledTimes(1);
      expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "ios_pdf_viewer_oversize_blocked",
          result: "error",
          errorClass: "IosPdfOversizeError",
          extra: expect.objectContaining({
            platform: "ios",
            sizeBytes: 20_000_000,
            limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
            blockedReason: "oversized_pdf",
            documentType: "request",
            originModule: "foreman",
            fileName: "big-file.pdf",
          }),
        }),
      );
    });

    // Returns IosPdfOversizeError
    it("returns an IosPdfOversizeError", () => {
      const error = recordPdfPreviewOversizeBlocked({
        sizeBytes: 20_000_000,
        limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
      });
      expect(error).toBeInstanceOf(IosPdfOversizeError);
      expect(error.sizeBytes).toBe(20_000_000);
      expect(error.limitBytes).toBe(IOS_PDF_PREVIEW_MAX_BYTES);
      expect(error.action).toBe("preview");
    });

    // Only one observability event per call (no duplicates)
    it("emits exactly one observability event per call", () => {
      recordPdfPreviewOversizeBlocked({
        sizeBytes: 30_000_000,
        limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
      });
      recordPdfPreviewOversizeBlocked({
        sizeBytes: 40_000_000,
        limitBytes: IOS_PDF_PREVIEW_MAX_BYTES,
      });
      expect(mockRecordPlatformObservability).toHaveBeenCalledTimes(2);
    });
  });

  describe("constant", () => {
    it("IOS_PDF_PREVIEW_MAX_BYTES is 15 MB", () => {
      expect(IOS_PDF_PREVIEW_MAX_BYTES).toBe(15 * 1024 * 1024);
    });

    it("IOS_PDF_PREVIEW_MAX_BYTES is a positive integer", () => {
      expect(Number.isInteger(IOS_PDF_PREVIEW_MAX_BYTES)).toBe(true);
      expect(IOS_PDF_PREVIEW_MAX_BYTES).toBeGreaterThan(0);
    });
  });
});
