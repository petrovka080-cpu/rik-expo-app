import { readOwnerReplaySources } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not fake external user traffic", () => {
  const source = readOwnerReplaySources();

  expect(source).toContain("real_external_user_traffic_proven: false");
  expect(source).toContain("real_user_traffic_claimed: false");
  expect(source).not.toMatch(/real_external_user_traffic_proven:\s*true|real_user_traffic_claimed:\s*true/);
});
