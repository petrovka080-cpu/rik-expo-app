import { buildForemanAiEstimateEntry } from "../../src/lib/foreman";
import { loadControlledPilotDryRunScenarios } from "../../scripts/estimate/runControlledPilotDryRunScenarios";

describe("controlled pilot foreman flow", () => {
  it("covers materials and subcontracts estimates through the shared AI estimate entry contracts", () => {
    const scenarioFile = loadControlledPilotDryRunScenarios();
    const materials = scenarioFile.scenarios.filter((scenario) => scenario.flow === "foreman_materials_estimate");
    const subcontracts = scenarioFile.scenarios.filter((scenario) => scenario.flow === "foreman_subcontracts_estimate");
    const materialsEntry = buildForemanAiEstimateEntry("foreman_materials_block");
    const subcontractsEntry = buildForemanAiEstimateEntry("foreman_subcontracts_block");

    expect(materials.length).toBeGreaterThanOrEqual(10);
    expect(subcontracts.length).toBeGreaterThanOrEqual(10);
    expect(materialsEntry.usesSharedAiEstimateEngine).toBe(true);
    expect(materialsEntry.usesGlobalEstimatePipeline).toBe(true);
    expect(materialsEntry.requiresUserConfirmationBeforeSubmit).toBe(true);
    expect(subcontractsEntry.usesSharedAiEstimateEngine).toBe(true);
    expect(subcontractsEntry.usesGlobalEstimatePipeline).toBe(true);
    expect(subcontractsEntry.requiresUserConfirmationBeforeSubmit).toBe(true);
  });
});
