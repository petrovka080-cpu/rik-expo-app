import { resolveMediaRoleAccess } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("client cannot see internal media without client-visible approval", () => {
  const decision = resolveMediaRoleAccess(mediaAsset(), {
    userId: "client-1",
    role: "client",
    orgId: "org-1",
  });
  expect(decision.canOpen).toBe(false);
});
