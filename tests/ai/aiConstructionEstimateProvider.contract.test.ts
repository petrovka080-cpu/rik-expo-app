import {
  parseConstructionEstimate,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction estimate provider", () => {
  it("parses estimate lines only from estimate or BOQ sources", () => {
    const source = constructionSources.find((item) => item.type === "estimate_pdf");
    expect(source).toBeTruthy();
    const result = parseConstructionEstimate({
      source: source!,
      rows: [{ id: "EST-77", labelRu: "Перегородки", qty: 42, unit: "м2", linkedWorkId: "work-1" }],
    });
    expect(result.lines[0]).toMatchObject({
      id: "EST-77",
      qty: 42,
      unit: "м2",
      sourceRef: source!.id,
    });

    const blocked = parseConstructionEstimate({
      source: constructionSources[0]!,
      rows: [{ id: "EST-1", labelRu: "Нельзя", qty: 1, unit: "шт" }],
    });
    expect(blocked.lines).toEqual([]);
    expect(blocked.blockedReason).toBe("BLOCKED_ESTIMATE_PROVIDER_NOT_CONNECTED");
  });
});
