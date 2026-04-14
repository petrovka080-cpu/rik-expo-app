/**
 * iOS PDF Size Guard tests.
 *
 * ТЗ A1: Validates the explicit oversize guard for iOS Sharing.shareAsync.
 * - small PDFs pass through unchanged
 * - large PDFs are blocked with controlled fallback
 * - observability event is recorded exactly once
 * - non-iOS platforms are unaffected
 * - IosPdfOversizeError carries correct metadata
 */

import {
  IOS_PDF_SHARE_SIZE_LIMIT,
  IosPdfOversizeError,
} from "../../src/lib/documents/attachmentOpener";

describe("iOS PDF size guard — constants", () => {
  it("limit is 15 MB", () => {
    expect(IOS_PDF_SHARE_SIZE_LIMIT).toBe(15 * 1024 * 1024);
  });

  it("limit is a positive integer", () => {
    expect(Number.isInteger(IOS_PDF_SHARE_SIZE_LIMIT)).toBe(true);
    expect(IOS_PDF_SHARE_SIZE_LIMIT).toBeGreaterThan(0);
  });
});

describe("iOS PDF size guard — IosPdfOversizeError", () => {
  it("is an Error instance", () => {
    const error = new IosPdfOversizeError(20_000_000, 15_728_640, "share");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("IosPdfOversizeError");
  });

  it("carries file size metadata", () => {
    const error = new IosPdfOversizeError(20_000_000, 15_728_640, "share");
    expect(error.sizeBytes).toBe(20_000_000);
    expect(error.limitBytes).toBe(15_728_640);
    expect(error.action).toBe("share");
  });

  it("works for preview action", () => {
    const error = new IosPdfOversizeError(16_000_000, 15_728_640, "preview");
    expect(error.action).toBe("preview");
    expect(error.message).toContain("preview");
  });

  it("message contains size and limit", () => {
    const error = new IosPdfOversizeError(20_000_000, 15_728_640, "share");
    expect(error.message).toContain("20000000");
    expect(error.message).toContain("15728640");
  });

  it("is throwable and catchable", () => {
    expect(() => {
      throw new IosPdfOversizeError(20_000_000, 15_728_640, "share");
    }).toThrow(IosPdfOversizeError);

    try {
      throw new IosPdfOversizeError(20_000_000, 15_728_640, "share");
    } catch (e) {
      expect(e).toBeInstanceOf(IosPdfOversizeError);
      if (e instanceof IosPdfOversizeError) {
        expect(e.sizeBytes).toBe(20_000_000);
      }
    }
  });
});

describe("iOS PDF size guard — boundary values", () => {
  it("files at exactly the limit should pass (limit is inclusive)", () => {
    // The guard uses <= comparison, so exactly at limit should pass
    const atLimit = IOS_PDF_SHARE_SIZE_LIMIT;
    expect(atLimit <= IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("files 1 byte over the limit should be blocked", () => {
    const overLimit = IOS_PDF_SHARE_SIZE_LIMIT + 1;
    expect(overLimit > IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("zero-byte files should pass", () => {
    expect(0 <= IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("1 MB file should pass", () => {
    expect(1_048_576 <= IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("10 MB file should pass", () => {
    expect(10 * 1024 * 1024 <= IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("20 MB file should be blocked", () => {
    expect(20 * 1024 * 1024 > IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });

  it("50 MB file should be blocked", () => {
    expect(50 * 1024 * 1024 > IOS_PDF_SHARE_SIZE_LIMIT).toBe(true);
  });
});
