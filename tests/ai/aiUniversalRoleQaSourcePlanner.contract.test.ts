import {
  extractUniversalRoleQaEntity,
  extractUniversalRoleQaFilters,
  classifyUniversalRoleQaIntent,
  planUniversalRoleQaSources,
  resolveUniversalRoleContext,
  resolveUniversalScreenContext,
} from "../../src/lib/ai/universalRoleQa";

function plan(questionRu: string, role = "director") {
  return planUniversalRoleQaSources({
    questionRu,
    roleContext: resolveUniversalRoleContext(role),
    screenContext: resolveUniversalScreenContext(role),
    intent: classifyUniversalRoleQaIntent(questionRu, role),
    entity: extractUniversalRoleQaEntity(questionRu),
    filters: extractUniversalRoleQaFilters(questionRu, "2026-05-20"),
  });
}

describe("S_AI_UNIVERSAL_ROLE_QA: source planner", () => {
  it("blocks public web for internal app questions", () => {
    const sourcePlan = plan("какие платежи без документов", "accountant");
    expect(sourcePlan.internetAllowed).toBe(false);
    expect(sourcePlan.forbiddenSources).toContain("public_web");
  });

  it("orders marketplace internal sources before public web", () => {
    const sourcePlan = plan("найди поставщиков ГКЛ", "buyer");
    expect(sourcePlan.marketplaceFirst).toBe(true);
    expect(sourcePlan.sourceOrder.indexOf("internal_marketplace")).toBeLessThan(sourcePlan.sourceOrder.indexOf("public_web"));
  });
});
