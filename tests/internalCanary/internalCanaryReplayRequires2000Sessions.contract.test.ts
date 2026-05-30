import { selectInternalCanaryReplaySessions } from "../../scripts/e2e/aiEstimateInternalCanaryCore";

test("internal canary replay selects 2000 production-like sessions with required route split", () => {
  const sessions = selectInternalCanaryReplaySessions();
  expect(sessions).toHaveLength(2000);
  expect(sessions.filter((item) => item.item.route === "/request")).toHaveLength(700);
  expect(sessions.filter((item) => item.item.route === "/ai?context=foreman")).toHaveLength(700);
  expect(sessions.filter((item) => item.item.route === "/ai?context=request")).toHaveLength(600);
});
