import {
  AI_SCREEN_RUNTIME_REQUIRED_SCREEN_IDS,
  AI_SCREEN_RUNTIME_REGISTRY,
  getAiScreenRuntimeEntry,
  listAiScreenRuntimeEntries,
} from "../../src/features/ai/screenRuntime/aiScreenRuntimeRegistry";
import { AI_SCREEN_RUNTIME_PRODUCERS } from "../../src/features/ai/screenRuntime/aiScreenRuntimeProducers";

describe("AI screen runtime registry", () => {
  it("registers every major screen in the cross-screen runtime matrix", () => {
    const ids = listAiScreenRuntimeEntries().map((entry) => entry.screenId);

    expect(ids).toEqual(expect.arrayContaining([...AI_SCREEN_RUNTIME_REQUIRED_SCREEN_IDS]));
    expect(getAiScreenRuntimeEntry("director.dashboard")).toMatchObject({
      domain: "control",
      producerName: "directorControlProducer",
      mounted: "mounted",
    });
    expect(getAiScreenRuntimeEntry("documents.surface")).toMatchObject({
      mounted: "future_or_not_mounted",
    });
  });

  it("declares role policy, evidence policy, maxCards, and zero mutation producers", () => {
    expect(AI_SCREEN_RUNTIME_REGISTRY.every((entry) => entry.evidenceRequired === true)).toBe(true);
    expect(AI_SCREEN_RUNTIME_REGISTRY.every((entry) => entry.allowedRoles.length > 0)).toBe(true);
    expect(AI_SCREEN_RUNTIME_REGISTRY.every((entry) => entry.maxCards > 0 && entry.maxCards <= 2)).toBe(true);
    expect(AI_SCREEN_RUNTIME_PRODUCERS.every((producer) => producer.metadata.mutationCount === 0)).toBe(true);
    expect(AI_SCREEN_RUNTIME_PRODUCERS.every((producer) => producer.metadata.requiredEvidence === true)).toBe(true);
  });
});
