import { listUniversalScreenManifests } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: screen manifest", () => {
  it("knows live AI screens, roles, default contexts and concrete actions", () => {
    const manifests = listUniversalScreenManifests();
    const foreman = manifests.find((screen) => screen.screenId === "foreman.main");

    expect(manifests.length).toBeGreaterThanOrEqual(11);
    expect(foreman).toMatchObject({
      route: "/ai?context=foreman",
      role: "foreman",
      defaultContextKind: "workday_snapshot",
    });
    expect(foreman?.allowedDomains).toEqual(expect.arrayContaining(["field", "documents", "construction_knowledge", "web"]));
    expect(foreman?.forbiddenDomains).toEqual(expect.arrayContaining(["full_finance", "security_runtime"]));
    expect(foreman?.aiActions.every((action) => action.concreteQuestionRu.length > 20)).toBe(true);
  });
});
