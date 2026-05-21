import { classifyUniversalIntent, listUniversalRoleDefaultContexts } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: role questions", () => {
  it("keeps role context as permission/default context, not as forced answer", () => {
    expect(classifyUniversalIntent("что мне решить сегодня")).toBe("director_decision_summary");
    expect(listUniversalRoleDefaultContexts().find((role) => role.role === "director")?.defaultSources).toEqual(expect.arrayContaining([
      "approvals",
      "finance",
      "procurement",
      "warehouse",
    ]));
  });
});
