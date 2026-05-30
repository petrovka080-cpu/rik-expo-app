import { readOwnerReplaySources } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture requires web, Android API34, and PDF evidence", () => {
  const source = readOwnerReplaySources();

  expect(source).toContain("ai-estimate-owner-account-live-replay-proof");
  expect(source).toContain("web_results.json");
  expect(source).toContain("android_api34_results.json");
  expect(source).toContain("pdf_text_extract.json");
  expect(source).toContain("api36_rejected");
});
