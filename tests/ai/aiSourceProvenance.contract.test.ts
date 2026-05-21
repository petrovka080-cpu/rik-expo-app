import {
  buildAiSourceProvenance,
  sourceProvenanceBlockers,
} from "../../src/lib/ai/liveUi";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: provenance rules", () => {
  it("prevents unsafe origins from being presented as project facts", () => {
    const demo = buildAiSourceProvenance({
      origin: "demo_fixture",
      sourceLabelRu: "demo fixture",
    });
    const unknown = buildAiSourceProvenance({
      origin: "unknown",
      sourceLabelRu: "unknown source",
    });
    const knowledge = buildAiSourceProvenance({
      origin: "general_construction_knowledge",
      sourceLabelRu: "типовой строительный шаблон",
    });

    expect(demo.canBePresentedAsFact).toBe(false);
    expect(unknown.canBePresentedAsFact).toBe(false);
    expect(knowledge.canBePresentedAsFact).toBe(false);
    expect(knowledge.requiresUserReview).toBe(true);
    expect(sourceProvenanceBlockers([demo, unknown, knowledge])).toEqual([]);
  });

  it("requires URL and checkedAt for public web facts", () => {
    const valid = buildAiSourceProvenance({
      origin: "public_web",
      sourceId: "web-1",
      sourceLabelRu: "public source",
      sourceUrl: "https://example.com/a",
      checkedAt: "2026-05-20T00:00:00.000Z",
    });
    const invalid = {
      ...valid,
      sourceUrl: undefined,
      checkedAt: undefined,
      canBePresentedAsFact: true,
    };

    expect(valid.canBePresentedAsFact).toBe(true);
    expect(sourceProvenanceBlockers([invalid])).toEqual(expect.arrayContaining([
      "public web source requires URL and checkedAt",
    ]));
  });
});
