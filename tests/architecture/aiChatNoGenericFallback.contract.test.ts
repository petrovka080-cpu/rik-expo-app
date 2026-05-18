import fs from "node:fs";
import path from "node:path";

import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

const root = path.join(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("AI chat no generic fallback architecture", () => {
  it("runs deterministic screen-context answers before provider/offline fallback", () => {
    const client = read("src/features/ai/assistantClient.ts");

    expect(client.indexOf("getAiAssistantDeterministicAnswer")).toBeLessThan(client.indexOf("providerApproved"));
    expect(client).not.toMatch(/I cannot help with that|module unavailable|provider unavailable/i);
  });

  it("recognizes normal Russian screen questions without falling through to generic chat", () => {
    const pack = getAiScreenMagicPack({
      role: "warehouse",
      context: "warehouse",
      screenId: "warehouse.main",
    });
    const answer = answerAiScreenMagicQuestion({
      pack,
      question: "Где дефицит и что можно открыть безопасно?",
    });

    expect(answer).toMatchObject({
      answeredFromScreenContext: true,
      providerCallAllowed: false,
    });
    expect(answer?.usedSignals.screenId).toBe("warehouse.main");
    expect(answer?.usedSignals.visibleDomainData.length).toBeGreaterThan(0);
    expect(answer?.answer).not.toMatch(/module unavailable|provider unavailable|I don't have context/i);
  });
});
