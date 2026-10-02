import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical historical draft projection ownership", () => {
  it("keeps the legacy module thin and routes internal callers to the canonical owner", () => {
    const root = resolve(__dirname, "../..");
    const compatibilitySource = readFileSync(
      resolve(root, "src/lib/estimate/createEstimateDraftRevision.ts"),
      "utf8",
    );
    expect(compatibilitySource).toContain(
      'export * from "./backendPlatform/canonicalEstimateHistoricalDraftProjection"',
    );
    expect(compatibilitySource).not.toMatch(/function\s+createEstimateDraftRevision\s*\(/u);

    const internalCallers = [
      "src/lib/estimate/application/createInitialEstimateDraftRevision.ts",
      "src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateHistoricalRecalculation.ts",
      "src/lib/estimate/formula/validateAiEstimateFormulaDag.ts",
      "src/lib/estimate/replayEstimateFromRecord.ts",
      "src/lib/estimate/revision/validateAiEstimateRevisionEngineV2.ts",
      "src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime.ts",
      "src/lib/estimate/runtime/buildProfessionalBoqRowsFromRuntimeDraft.ts",
      "src/lib/estimate/runtime/createAiEstimateRuntime.ts",
      "src/lib/estimate/storage/validateAiEstimateStorageBoundary.ts",
      "src/lib/estimate/validateEstimateLineage.ts",
    ];
    for (const relativePath of internalCallers) {
      const source = readFileSync(resolve(root, relativePath), "utf8");
      expect(source).toContain("canonicalEstimateHistoricalDraftProjection");
      expect(source).not.toMatch(/from ["'][^"']*createEstimateDraftRevision["']/u);
    }
  });

  it("preserves the exact compatibility exports", () => {
    const compatibility = require("../../src/lib/estimate/createEstimateDraftRevision");
    const canonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateHistoricalDraftProjection",
    );
    expect(compatibility.createEstimateDraftRevision).toBe(canonical.createEstimateDraftRevision);
    expect(compatibility.createInitialEstimateDraftRevisionState).toBe(
      canonical.createInitialEstimateDraftRevisionState,
    );
    expect(compatibility.buildProfessionalBoqRowsFromConsumerDraft).toBe(
      canonical.buildProfessionalBoqRowsFromConsumerDraft,
    );
    expect(compatibility.ESTIMATE_RESOLVED_IDENTITY_COMPILER_VERSION).toBe(
      canonical.ESTIMATE_RESOLVED_IDENTITY_COMPILER_VERSION,
    );
  });
});
