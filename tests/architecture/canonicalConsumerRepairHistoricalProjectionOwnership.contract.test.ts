import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical consumer-repair historical projection ownership", () => {
  it("keeps the retired feature adapter thin and routes the feature barrel to the shared owner", () => {
    const root = resolve(__dirname, "../..");
    const compatibilitySource = readFileSync(
      resolve(root, "src/features/consumerRepair/consumerRepairAiAdapter.ts"),
      "utf8",
    );
    expect(compatibilitySource).toContain("canonicalConsumerRepairHistoricalProjection");
    expect(compatibilitySource).not.toMatch(/function\s+buildConsumerRepairAiDraft\s*\(/u);

    const barrelSource = readFileSync(
      resolve(root, "src/features/consumerRepair/index.ts"),
      "utf8",
    );
    expect(barrelSource).toContain("canonicalConsumerRepairHistoricalProjection");
    expect(barrelSource).not.toContain('from "./consumerRepairAiAdapter"');
  });

  it("preserves every public compatibility identity", () => {
    const compatibility = require("../../src/features/consumerRepair/consumerRepairAiAdapter");
    const canonical = require(
      "../../src/lib/consumerRequests/canonicalConsumerRepairHistoricalProjection",
    );
    expect(compatibility.buildConsumerRepairAiDraft).toBe(canonical.buildConsumerRepairAiDraft);
    expect(compatibility.buildDirectConsumerRepairOpenWorldAiDraft).toBe(
      canonical.buildDirectConsumerRepairOpenWorldAiDraft,
    );
    expect(compatibility.isDangerousConsumerRepairProblem).toBe(
      canonical.isDangerousConsumerRepairProblem,
    );
    expect(compatibility.CONSUMER_REPAIR_DANGEROUS_COPY).toBe(
      canonical.CONSUMER_REPAIR_DANGEROUS_COPY,
    );
    expect(typeof compatibility.composeConsumerRepairDraftAnswerRu).toBe("function");
  });
});
