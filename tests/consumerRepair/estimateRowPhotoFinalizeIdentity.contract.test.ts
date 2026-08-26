import fs from "node:fs";
import path from "node:path";

describe("R5.5 estimate row photo finalize identity", () => {
  it("returns the complete authoritative attachment identity from finalization", () => {
    const migration = fs.readFileSync(path.join(
      process.cwd(),
      "supabase/migrations/20260819223000_estimate_revision_photo_finalize_identity_r55.sql",
    ), "utf8");
    const edge = fs.readFileSync(path.join(
      process.cwd(),
      "supabase/functions/canonical-estimate/index.ts",
    ), "utf8");
    const localBackend = fs.readFileSync(path.join(
      process.cwd(),
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    ), "utf8");

    for (const field of [
      "attachment_event_id uuid",
      "tenant_id uuid",
      "owner_user_id uuid",
      "request_id text",
      "catalog_id text",
      "parent_revision_id uuid",
      "row_id text",
      "storage_bucket text",
      "storage_object_key text",
      "content_sha256 text",
      "mime_type text",
      "size_bytes bigint",
      "attachment_status text",
      "created_by uuid",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain(
      "v_attachment.tenant_id, v_attachment.owner_user_id, v_attachment.request_id",
    );
    expect(migration).toContain(
      "v_attachment.catalog_id, v_attachment.parent_revision_id, v_attachment.row_id",
    );
    expect(edge).toContain("tenantId: row.tenant_id");
    expect(edge).toContain("ownerUserId: row.owner_user_id");
    expect(edge).toContain("requestId: row.request_id");
    expect(edge).toContain("catalogId: row.catalog_id");
    expect(localBackend).toContain("tenantId: row.tenant_id");
    expect(localBackend).toContain("ownerUserId: row.owner_user_id");
    expect(localBackend).toContain("requestId: row.request_id");
    expect(localBackend).toContain("catalogId: row.catalog_id");
  });
});
