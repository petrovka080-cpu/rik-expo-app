import {
  buildWholeApp50kExplainP95Report,
  WHOLE_APP_50K_BASELINE,
  WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
  WHOLE_APP_50K_GREEN_STATUS,
  WHOLE_APP_QUERY_PATHS,
} from "../../scripts/audit/wholeApp50kExplainP95.shared";
import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k EXPLAIN/P95 query contract", () => {
  it("covers every core product query path in the Wave 02 scope", () => {
    expect(WHOLE_APP_QUERY_PATHS.map((query) => query.id)).toEqual(
      expect.arrayContaining([
        "listConsumerRepairRequestHistory",
        "getConsumerRepairRequest",
        "sendConsumerRepairRequestToMarketplace",
        "listMarketplaceListings",
        "searchMarketplaceListings",
        "publishMarketplaceListing",
        "listOfficeRequests",
        "listMaterialRequests",
        "listProcurementRequests",
        "listWarehouseMovements",
        "listPayments",
        "listDocuments",
        "buildAiScreenContext",
        "listAiConversationHistory",
      ]),
    );
  });

  it("keeps the 50k fixture targets explicit and does not fake live green", () => {
    const report = buildWholeApp50kExplainP95Report();

    expect(report.fixtureSummary.target_fixture).toMatchObject(WHOLE_APP_50K_BASELINE);
    expect(
      report.matrix.final_status === WHOLE_APP_50K_GREEN_STATUS
        || String(report.matrix.final_status).startsWith("BLOCKED_EXTERNAL_ONLY_"),
    ).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);

    if (report.matrix.final_status !== WHOLE_APP_50K_GREEN_STATUS) {
      expect(report.matrix.live_fixture_verified).toBe(false);
      expect(report.matrix.external_blocker).toBeTruthy();
      if (report.matrix.external_blocker !== WHOLE_APP_50K_FIXTURE_DATA_BLOCKER) {
        expect(report.matrix.history_p95_lte_300ms).toBe(false);
        expect(report.matrix.ai_context_p95_lte_1000ms).toBe(false);
      }
    }
  });

  it("distinguishes insufficient live fixture data from query-plan failure", () => {
    const report = buildWholeApp50kExplainP95Report();

    expect(report.matrix).toHaveProperty("fixture_sufficient");
    expect(report.matrix).toHaveProperty("minimum_b2c_requests_required", WHOLE_APP_50K_BASELINE.b2c_requests);
    expect(report.proof).toContain("Fixture sufficient");

    if (report.matrix.live_db_reachable === true && report.matrix.fixture_sufficient === false) {
      expect(report.matrix.external_blocker).toBe(WHOLE_APP_50K_FIXTURE_DATA_BLOCKER);
      expect(report.matrix.final_status).toBe("BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED");
    }
  });

  it("has an executable live EXPLAIN/p95 harness behind explicit proof-db opt-in", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runWholeApp50kExplainP95LiveProof.ts"),
      "utf8",
    );
    const report = buildWholeApp50kExplainP95Report();

    expect(report.fixtureSummary).toMatchObject({
      live_runner_ready: true,
      live_runner: "scripts/e2e/runWholeApp50kExplainP95LiveProof.ts",
    });
    expect(source).toContain("WHOLE_APP_50K_DATABASE_URL");
    expect(source).toContain("ALLOW_WHOLE_APP_50K_LIVE_PROOF");
    expect(source).toContain("explain (analyze, buffers, format json)");
    expect(source).toContain("S_WHOLE_APP_50K_live_query_results.json");
    expect(source).toContain("p95_ms");
  });
});
