import { answerAiAppContextGraphFixture, buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS source refs", () => {
  it("requires every internal graph fact and answer fact to carry a sourceRef", () => {
    const graph = buildAiAppContextGraphFixture();
    const factRefs = graph.nodes.flatMap((node) => node.facts.map((fact) => fact.sourceRefId));
    const sourceIds = new Set(graph.sourceRefs.map((ref) => ref.id));

    expect(factRefs.length).toBeGreaterThan(0);
    expect(factRefs.every((id) => sourceIds.has(id))).toBe(true);

    const answer = answerAiAppContextGraphFixture("покажи заявки по первому этажу");
    const answerFactItems = answer.answerRu.sections.flatMap((section) =>
      section.items.filter((item) => item.status !== "missing" && item.status !== "checked_empty"),
    );
    expect(answerFactItems.every((item) => item.sourceRefIds.length > 0)).toBe(true);
  });
});
