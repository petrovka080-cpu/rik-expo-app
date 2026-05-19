import {
  retrieveConstructionRoleScopedContext,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction role-scoped access", () => {
  it("blocks non-director finance leaks and contractor foreign records", () => {
    const foreman = retrieveConstructionRoleScopedContext({
      scope: { role: "foreman", screenId: "foreman.main" },
      sources: constructionSources,
    });
    expect(foreman.sources.some((source) => source.type === "payment")).toBe(false);
    expect(foreman.deniedSourceIds).toContain("source:payment:1");

    const contractor = retrieveConstructionRoleScopedContext({
      scope: { role: "contractor", screenId: "contractor.main", allowedWorkIds: ["work-2"] },
      sources: constructionSources,
    });
    expect(contractor.sources.some((source) => source.linkedWorkId === "work-1")).toBe(false);

    const director = retrieveConstructionRoleScopedContext({
      scope: { role: "director", screenId: "director.dashboard" },
      sources: constructionSources,
    });
    expect(director.sources.some((source) => source.type === "payment")).toBe(true);
    expect(director.sources.some((source) => source.type === "warehouse_stock")).toBe(true);
  });
});
