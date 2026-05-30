import { expectNoForbiddenP1Path } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh does not change estimator engine behavior", () => {
  expectNoForbiddenP1Path((file) =>
    file.startsWith("src/lib/ai/estimatorKernel/") ||
    file.startsWith("src/lib/ai/constructionInterpreter/") ||
    file.startsWith("src/lib/ai/globalEstimate/"),
  );
});
