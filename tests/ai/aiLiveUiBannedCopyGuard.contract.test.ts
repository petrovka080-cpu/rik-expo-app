import { findLiveAiBannedCopy } from "../../src/lib/ai/liveUi";
import {
  allLiveAnswers,
  bannedPhrases,
} from "./aiLiveUiTestHelpers";

describe("live AI banned copy guard", () => {
  it("blocks banned normal-user copy from every live answer", () => {
    expect(bannedPhrases()).toContain("Нужен конкретный источник");
    expect(bannedPhrases()).toContain("Проверен экран");
    for (const answer of allLiveAnswers()) {
      expect(findLiveAiBannedCopy(answer.answerTextRu)).toEqual([]);
      expect(answer.bannedCopyFound).toEqual([]);
    }
  });
});
