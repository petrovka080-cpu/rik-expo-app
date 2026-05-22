import { buildMediaStorage100kSchemaAudit } from "../../scripts/audit/mediaStorage100k.shared";

describe("media storage 100k schema/index coverage", () => {
  it("has RLS, storage buckets, cleanup table, and 100k indexes", () => {
    const audit = buildMediaStorage100kSchemaAudit();

    expect(audit.media_tables_present).toBe(true);
    expect(audit.rls_enabled_all_media_tables).toBe(true);
    expect(audit.storage_buckets_private_public_shape_ok).toBe(true);
    expect(audit.indexes_verified).toBe(true);
    expect(audit.proof_function_present).toBe(true);
  });
});
