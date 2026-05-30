import { expectNoForbiddenP1Path } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh does not change PDF renderer code", () => {
  expectNoForbiddenP1Path((file) =>
    file.startsWith("src/lib/estimatePdf/") ||
    file.startsWith("src/lib/pdf/") ||
    file.startsWith("src/lib/ai/estimatePdf/"),
  );
});
