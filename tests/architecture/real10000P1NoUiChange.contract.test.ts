import { expectNoForbiddenP1Path } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh does not change UI code", () => {
  expectNoForbiddenP1Path((file) =>
    file.startsWith("app/") ||
    file.startsWith("src/screens/") ||
    file.startsWith("src/components/") ||
    file.startsWith("src/ui/") ||
    file.startsWith("src/features/"),
  );
});
