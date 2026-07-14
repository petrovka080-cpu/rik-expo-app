import {
  buildControlledPilotDryRunCaseResults,
  loadControlledPilotDryRunScenarios,
} from "../../scripts/estimate/runControlledPilotDryRunScenarios";
import { validateControlledPilotDryRunWebAndroidParity } from "../../scripts/e2e/runControlledPilotDryRunWebAndroidParity";

describe("controlled pilot director and buyer flow", () => {
  it("covers director review and buyer procurement handoff and keeps parity hashes comparable", () => {
    const scenarioFile = loadControlledPilotDryRunScenarios();
    const director = scenarioFile.scenarios.filter((scenario) => scenario.flow === "director_review");
    const buyer = scenarioFile.scenarios.filter((scenario) => scenario.flow === "buyer_procurement_handoff");
    const results = buildControlledPilotDryRunCaseResults(scenarioFile.scenarios);
    const summary = {
      corpus_fingerprint: "same",
      case_ids: results.map((result) => result.case_id),
      aggregate_snapshot_hash: "snapshot",
      aggregate_pdf_buyer_hash: "pdf-buyer",
      aggregate_history_count_hash: "history",
      owner_review_status: "PENDING_OWNER_REVIEW",
    };

    expect(director.length).toBeGreaterThanOrEqual(5);
    expect(buyer.length).toBeGreaterThanOrEqual(5);
    expect(results.every((result) => result.contract_total_claimed === false)).toBe(true);
    expect(validateControlledPilotDryRunWebAndroidParity({ web: summary, android: summary }).blockers).toEqual([]);
  });
});
