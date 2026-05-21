import { createDeterministicMediaAiAnalysis, guardMediaAiAnalysis } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("AI media safety guard blocks final facts and private token leaks", () => {
  const asset = mediaAsset();
  const analysis = createDeterministicMediaAiAnalysis({ asset, analyzedAt: "2026-05-21T00:00:00.000Z" });
  expect(guardMediaAiAnalysis({ asset, analysis, presentedTextRu: "Подсказка без приватных ссылок." }).passed).toBe(true);
  expect(guardMediaAiAnalysis({ asset, analysis, presentedTextRu: "signedUrl показан" }).failureReason).toBe("signed_url_leaked");
});
