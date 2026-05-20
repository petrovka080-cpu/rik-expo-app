import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live security runtime permission guard", () => {
  it("sanitizes security and runtime outputs for normal users", () => {
    const security = answerLiveAiForContext({ context: "security", userText: "Safe security summary" });
    const runtime = answerLiveAiForContext({ context: "runtime", userText: "Runtime screen" });

    for (const answer of [security, runtime]) {
      expect(answer.pipelineKey).toBe("securityRuntime");
      expect(answer.answerTextRu).not.toMatch(/raw|secret|service_role|provider|runtime|transport/i);
      expect(answer.answerTextRu).toMatch(/safe|health|redacted|безопас/i);
      expectUsefulLiveAnswer(answer);
    }
  });
});
