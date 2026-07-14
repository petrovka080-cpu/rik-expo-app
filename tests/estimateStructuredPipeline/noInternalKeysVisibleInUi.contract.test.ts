import { allPayloads, expectNoForbiddenVisibleText, visibleTextFromPayload } from "./structuredPipelineTestHelpers";

describe("structured estimate UI visible keys", () => {
  it("does not expose internal keys in visible UI text", () => {
    for (const payload of allPayloads()) {
      expectNoForbiddenVisibleText(visibleTextFromPayload(payload));
    }
  });
});
