import {
  aiActionPdfTextForPayload,
  aiPdfTextForPayload,
  allPayloads,
  expectNoForbiddenVisibleText,
  requestPdfTextForPayload,
} from "./structuredPipelineTestHelpers";

describe("structured estimate PDF visible keys", () => {
  it("does not expose internal keys in request or AI PDFs", () => {
    for (const payload of allPayloads().slice(0, 2)) {
      expectNoForbiddenVisibleText(requestPdfTextForPayload(payload));
      expectNoForbiddenVisibleText(aiPdfTextForPayload(payload));
      expectNoForbiddenVisibleText(aiActionPdfTextForPayload(payload));
    }
  });
});
