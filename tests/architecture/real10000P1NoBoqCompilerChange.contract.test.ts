import { expectNoForbiddenP1Path } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh does not change BOQ compiler behavior", () => {
  expectNoForbiddenP1Path((file) =>
    file.startsWith("src/lib/ai/professionalBoq/") ||
    file.startsWith("src/lib/ai/constructionPrimitives/") ||
    file.startsWith("src/lib/ai/constructionFormulas/"),
  );
});
