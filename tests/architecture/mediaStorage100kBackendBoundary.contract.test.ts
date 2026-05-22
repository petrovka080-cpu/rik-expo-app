import {
  buildMediaPdfSignedUrlPrivacyAudit,
  buildMediaStorage100kBackpressureAudit,
} from "../../scripts/audit/mediaStorage100k.shared";

describe("media storage 100k backend boundary", () => {
  it("keeps storage mutation and cleanup behind backend/service boundaries", () => {
    const privacy = buildMediaPdfSignedUrlPrivacyAudit();
    const backpressure = buildMediaStorage100kBackpressureAudit();

    expect(privacy.screen_side_storage_mutation_found).toBe(false);
    expect(privacy.frontend_direct_storage_delete_found).toBe(false);
    expect(backpressure.service_boundary_exports_ready).toBe(true);
  });
});
