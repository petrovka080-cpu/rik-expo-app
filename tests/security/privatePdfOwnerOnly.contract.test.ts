import { buildRlsDynamicCrossTenantReport, RLS_TARGET_GROUPS } from "../../scripts/audit/rlsDynamicCrossTenant.shared";

describe("RLS private PDF owner-only contract", () => {
  it("tracks private PDF rows and private storage buckets as owner-scoped evidence", () => {
    const report = buildRlsDynamicCrossTenantReport();
    const pdfGroup = RLS_TARGET_GROUPS.find((group) => group.logicalName === "consumer_repair_request_pdfs");
    const attempts = report.crossTenantAttempts.attempts as Array<Record<string, unknown>>;
    const buckets = report.storagePolicies.buckets as Array<Record<string, unknown>>;

    expect(pdfGroup).toMatchObject({
      isolation: "storage_owner",
      requiredAssertions: expect.arrayContaining(["private_pdf_owner_only", "wrong_user_pdf_blocked"]),
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "consumer_a",
          target: "consumer_b",
          relation: "consumer_repair_request_pdfs",
          operation: "select",
          expected: "blocked",
        }),
      ]),
    );
    expect(buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bucket_id: "private-media",
          expected_public: false,
        }),
        expect.objectContaining({
          bucket_id: "client-visible-media",
          expected_public: false,
        }),
      ]),
    );
  });
});
