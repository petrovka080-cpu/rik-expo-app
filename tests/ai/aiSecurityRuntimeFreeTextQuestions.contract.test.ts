import { answerLiveAiForContext } from "../../src/lib/ai/liveUi/liveAiActionRouter";

describe("security runtime free text questions", () => {
  it("routes security and runtime free text through securityRuntime pipeline", () => {
    const security = answerLiveAiForContext({ context: "security", userText: "есть ли approval bypass" });
    const runtime = answerLiveAiForContext({ context: "runtime", userText: "почему release verify красный" });
    expect(security.providerTrace).toContain("securityRuntime");
    expect(runtime.providerTrace).toContain("securityRuntime");
    expect(security.answerTextRu).toMatch(/Approval bypass|Источники|Следующий шаг/);
    expect(runtime.answerTextRu).toMatch(/release green|Release verify|Следующий шаг/);
  });
});
