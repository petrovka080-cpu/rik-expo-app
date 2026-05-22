import {
  buildRlsDynamicCrossTenantReport,
  RLS_ACTORS,
  RLS_DYNAMIC_GREEN_STATUS,
  RLS_TARGET_GROUPS,
} from "../../scripts/audit/rlsDynamicCrossTenant.shared";
import fs from "node:fs";
import path from "node:path";

describe("RLS dynamic cross-tenant proof contract", () => {
  it("tracks the required actors, private table groups, and an honest final status", () => {
    const report = buildRlsDynamicCrossTenantReport();
    const matrix = report.matrix;

    expect(report.inventory.actors).toEqual(RLS_ACTORS);
    expect(report.inventory.target_groups).toEqual(RLS_TARGET_GROUPS);
    expect(RLS_TARGET_GROUPS.map((group) => group.logicalName)).toEqual(
      expect.arrayContaining([
        "consumer_repair_requests",
        "consumer_repair_request_items",
        "consumer_repair_request_media",
        "consumer_repair_request_pdfs",
        "consumer_marketplace_links",
        "marketplace_listings",
        "marketplace_listing_media",
        "marketplace_listing_events",
        "office_requests",
        "material_requests",
        "procurement_requests",
        "warehouse_movements",
        "payments",
        "documents",
        "audit_events",
        "ai_context_events",
      ]),
    );

    expect(
      matrix.final_status === RLS_DYNAMIC_GREEN_STATUS
        || String(matrix.final_status).startsWith("BLOCKED_EXTERNAL_ONLY_"),
    ).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
    expect(report.proof).toContain(String(matrix.final_status));
  });

  it("does not mark runtime isolation green unless live dynamic attempts executed", () => {
    const report = buildRlsDynamicCrossTenantReport();

    if (report.matrix.final_status !== RLS_DYNAMIC_GREEN_STATUS) {
      expect(report.matrix.dynamic_runtime_executed).toBe(false);
      expect(report.matrix.external_blocker).toBeTruthy();
      expect(report.matrix.cross_tenant_read_blocked).toBe(false);
      expect(report.matrix.cross_tenant_write_blocked).toBe(false);
      expect(report.matrix.cross_tenant_delete_blocked).toBe(false);
    }
  });

  it("has a rollback-only live proof harness for the external database gate", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts"),
      "utf8",
    );
    const report = buildRlsDynamicCrossTenantReport();

    expect(report.crossTenantAttempts).toMatchObject({
      live_runner_ready: true,
      live_runner: "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts",
    });
    expect(source).toContain("SUPABASE_RLS_PROOF_DATABASE_URL");
    expect(source).toContain("ALLOW_RLS_DYNAMIC_MUTATION_PROOF");
    expect(source).toContain("set local role ${role}");
    expect(source).toContain("rollback");
    expect(source).toContain("cross_tenant_attempts_live");
    expect(source).not.toContain("await client.query(\"commit");
  });
});
