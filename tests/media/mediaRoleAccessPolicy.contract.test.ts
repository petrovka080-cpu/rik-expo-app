import { resolveMediaRoleAccess } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("role access blocks cross-org media", () => {
  const decision = resolveMediaRoleAccess(mediaAsset(), {
    userId: "foreman-1",
    role: "foreman",
    orgId: "other-org",
  });
  expect(decision.canOpen).toBe(false);
});
