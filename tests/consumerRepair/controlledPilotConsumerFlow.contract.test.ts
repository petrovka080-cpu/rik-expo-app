import {
  buildControlledPilotDryRunCaseResults,
  loadControlledPilotDryRunScenarios,
} from "../../scripts/estimate/runControlledPilotDryRunScenarios";

describe("controlled pilot consumer flow", () => {
  it("covers /request, approved history reload and PDF from approved snapshot", () => {
    const scenarioFile = loadControlledPilotDryRunScenarios();
    const consumerCases = scenarioFile.scenarios.filter((scenario) => scenario.flow === "consumer_request_estimate");
    const results = buildControlledPilotDryRunCaseResults(consumerCases);

    expect(consumerCases.length).toBeGreaterThanOrEqual(10);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.every((result) => result.history_count_hash.length > 0)).toBe(true);
    expect(results.every((result) => result.pdf_buyer_hash.length > 0)).toBe(true);
    expect(results.every((result) => result.owner_review_status === "PENDING_OWNER_REVIEW")).toBe(true);
  });
});
