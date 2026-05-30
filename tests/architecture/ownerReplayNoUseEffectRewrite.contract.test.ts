import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not use useEffect rewrites", () => {
  expectNoOwnerReplayPattern(/\buseEffect\s*\(/, "useEffect rewrite");
});
