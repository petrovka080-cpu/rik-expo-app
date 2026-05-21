import { makeAiSourceRefId } from "../../src/lib/ai/appContextGraph";
import { buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS field", () => {
  it("connects work to object, floor, zone, materials and documents", () => {
    const graph = buildAiAppContextGraphFixture();
    const work = graph.nodes.find((node) => node.ref.id === makeAiSourceRefId("work", "work-gkl-1"));
    const targetRefs = work?.links.map((link) => link.targetRefId) ?? [];

    expect(targetRefs).toEqual(expect.arrayContaining([
      makeAiSourceRefId("object", "obj-dom-1"),
      makeAiSourceRefId("floor", "floor-1"),
      makeAiSourceRefId("zone", "zone-a"),
      makeAiSourceRefId("material", "mat-gkl"),
      makeAiSourceRefId("pdf_document", "pdf-45"),
    ]));
  });
});
