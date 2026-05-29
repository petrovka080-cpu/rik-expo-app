import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not add useEffect answer rewrites in final readiness", () => {
  expect(finalReadinessReport().matrix.use_effect_rewrite_found).toBe(false);
});

