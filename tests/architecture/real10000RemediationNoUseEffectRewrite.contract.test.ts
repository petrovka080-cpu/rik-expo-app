import { changedRuntimeSources } from "./real10000RemediationArchitectureTestHelpers";

test("Real10000 remediation does not add a useEffect rewrite", () => {
  expect(changedRuntimeSources()).not.toMatch(/useEffect\s*\(/);
});
