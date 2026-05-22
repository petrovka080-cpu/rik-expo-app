import { buildMediaPdfSignedUrlPrivacyAudit } from "../../scripts/audit/mediaStorage100k.shared";

describe("media storage 100k privacy", () => {
  it("does not expose storage keys, signed URLs, or base64 storage in user-visible media/PDF flows", () => {
    const audit = buildMediaPdfSignedUrlPrivacyAudit();

    expect(audit.storage_key_visible_to_user).toBe(false);
    expect(audit.signed_url_visible_to_user).toBe(false);
    expect(audit.db_base64_storage_found).toBe(false);
    expect(audit.pdf_signed_url_expiry_enforced).toBe(true);
    expect(audit.pdf_storage_object_verified_before_row).toBe(true);
  });
});
