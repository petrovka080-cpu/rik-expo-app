import { expectNoForbiddenP1Path } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh does not change product logic", () => {
  expectNoForbiddenP1Path((file) => file.startsWith("src/") || file.startsWith("app/"));
});
