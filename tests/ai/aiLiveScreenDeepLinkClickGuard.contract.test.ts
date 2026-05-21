import { validateAiLiveDeepLinkClick } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen deep link click guard", () => {
  it("verifies enabled internal links change route and open an object", () => {
    const result = answerAiLiveScreenButtonFixture("documents.pdf_explain");
    const link = result.universalAnswer.openLinks.find((candidate) => candidate.enabled && candidate.route);
    expect(link).toBeTruthy();
    const click = validateAiLiveDeepLinkClick({
      link: link!,
      currentRoute: "/ai?context=documents",
    });
    expect(click).toMatchObject({
      clicked: true,
      routeChanged: true,
      objectOpened: true,
    });
  });
});
