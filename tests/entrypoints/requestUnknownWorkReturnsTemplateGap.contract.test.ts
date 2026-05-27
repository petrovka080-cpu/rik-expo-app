import { buildRequestAnswer, requestDraftFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("/request unknown construction work", () => {
  it("returns template gap safe triage instead of fake estimate", () => {
    const answer = buildRequestAnswer(WORLD_PROMPTS.unknown);
    const draft = requestDraftFor(WORLD_PROMPTS.unknown);

    expect(answer.toolResult.estimate).toBeUndefined();
    expect(answer.toolResult.blockedBy).toBe("TEMPLATE_GAP_SAFE_TRIAGE");
    expect(draft.items).toEqual([]);
    expect(`${draft.titleRu}\n${draft.summaryRu}\n${draft.missingData.join("\n")}`).toMatch(/ручная|шаблон|данные/i);
  });
});
