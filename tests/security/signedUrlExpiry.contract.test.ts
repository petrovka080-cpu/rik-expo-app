import {
  __resetConsumerRepairPdfStorageForTests,
  createConsumerRepairPdfSignedUrl,
  uploadConsumerRepairPdfObject,
} from "../../src/lib/consumerRequests/consumerRequestPdfStorage";
import {
  PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS,
  PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS,
  assertPrivateSignedUrlExpiry,
} from "../../src/lib/security/securityPrivacyHardening";
import { buildSignedUrlExpiryAudit } from "../../scripts/audit/securityPrivacyHardening.shared";

describe("private signed URL expiry", () => {
  beforeEach(() => {
    __resetConsumerRepairPdfStorageForTests();
    jest.spyOn(Date, "now").mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    __resetConsumerRepairPdfStorageForTests();
  });

  it("enforces short-lived private PDF, media, and attachment signed URL policies", () => {
    uploadConsumerRepairPdfObject({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
      body: "%PDF-1.4\n%%EOF",
      contentType: "application/pdf",
    });
    const signed = createConsumerRepairPdfSignedUrl({
      storageBucket: "private-media",
      storageKey: "consumer/request.pdf",
    });
    const audit = buildSignedUrlExpiryAudit();

    expect(signed.expiresAt).toBe(
      new Date(PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS * 1000).toISOString(),
    );
    expect(assertPrivateSignedUrlExpiry({ ttlSeconds: PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS })).toBe(true);
    expect(assertPrivateSignedUrlExpiry({ ttlSeconds: PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS + 1 })).toBe(false);
    expect(audit.private_pdf_signed_url_expiry_enforced).toBe(true);
    expect(audit.consumer_pdf_default_expiry_enforced).toBe(true);
    expect(audit.attachment_signed_url_expiry_enforced).toBe(true);
    expect(audit.media_signed_url_expiry_enforced).toBe(true);
    expect(audit.storage_bucket_policies_verified).toBe(true);
  });
});
