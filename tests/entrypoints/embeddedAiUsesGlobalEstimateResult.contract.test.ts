import fs from "node:fs";
import path from "node:path";

describe("AI estimate canonical backend binding", () => {
  it("does not import the embedded estimate compiler from the production assistant pipeline", () => {
    const source = fs.readFileSync(path.resolve("src/features/ai/assistantAnswerPipeline.ts"), "utf8");
    expect(source).toContain("createAiEstimatePlugin");
    expect(source).not.toContain('from "../../lib/ai/builtInAi"');
    expect(source).not.toMatch(/buildProfessionalExpandedGlobalEstimate|calculateGlobalConstructionEstimateSync/);
  });

  it("binds assistant output to exact backend revision and release identities", () => {
    const types = fs.readFileSync(path.resolve("src/features/ai/assistant.types.ts"), "utf8");
    const actions = fs.readFileSync(path.resolve("src/features/ai/AIAssistantEstimatePdfActions.tsx"), "utf8");
    expect(types).toContain("canonicalEstimateRevisionId");
    expect(types).toContain("canonicalEstimateReleaseId");
    expect(actions).toContain("buildCanonicalEstimateArtifact");
    expect(actions).toContain('artifact.status !== "ready"');
    expect(actions).toContain("artifact.revisionId !== message.canonicalEstimateRevisionId");
    expect(actions).toContain("artifact.releaseId !== message.canonicalEstimateReleaseId");
    expect(actions).toContain("CANONICAL_ARTIFACT_IDENTITY_MISMATCH");
  });
});
