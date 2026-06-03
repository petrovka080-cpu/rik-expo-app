import { collectBackendDataChecks, expectCheckPassed, readUtf8 } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("consumer request RLS policies", () => {
  it("keeps owner-scoped RLS for drafts, items, PDFs, links, and events", () => {
    expectCheckPassed(collectBackendDataChecks(), "consumer_request_rls_owner_policies_present");
    const migration = readUtf8("supabase/migrations/20260522123000_rls_dynamic_cross_tenant_static_coverage.sql");

    expect(migration).toMatch(/consumer_repair_request_drafts/i);
    expect(migration).toMatch(/consumer_user_id\s*=\s*auth\.uid\(\)/i);
    expect(migration).toMatch(/consumer_repair_request_items/i);
    expect(migration).toMatch(/consumer_repair_request_pdfs/i);
    expect(migration).toMatch(/consumer_marketplace_links/i);
  });
});
