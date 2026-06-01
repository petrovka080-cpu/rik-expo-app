import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not bypass git hooks from release-state cleanup automation", () => {
  expect(cleanupSources()).not.toMatch(/\b(HUSKY=0|SKIP_HOOKS|bypass hooks|hooks bypass)\b/i);
});
