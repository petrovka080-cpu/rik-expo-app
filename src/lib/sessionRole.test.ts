import type { User } from "@supabase/supabase-js";
import { ensureMyProfile, getMyRole } from "./api/profile";
import { clearCurrentSessionRoleCache, resolveCurrentSessionRole } from "./sessionRole";

jest.mock("./api/profile", () => ({ ensureMyProfile: jest.fn(), getMyRole: jest.fn() }));
jest.mock("./supabaseClient", () => ({ getSessionSafe: jest.fn() }));
jest.mock("./observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
  beginPlatformObservability: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const rpc = jest.mocked(getMyRole);
const ensure = jest.mocked(ensureMyProfile);
const user = (appMetadata = {}, userMetadata = {}) => ({
  id: "user-a", app_metadata: appMetadata, user_metadata: userMetadata,
}) as User;

beforeEach(() => {
  clearCurrentSessionRoleCache();
  jest.clearAllMocks();
  rpc.mockReset();
  ensure.mockResolvedValue(true);
});

it("ignores account-editable admin metadata and resolves the server role", async () => {
  rpc.mockResolvedValue("foreman");
  await expect(resolveCurrentSessionRole({ user: user({}, { role: "admin" }) }))
    .resolves.toMatchObject({ role: "foreman", source: "rpc" });
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("does not use editable metadata when the server has no role", async () => {
  rpc.mockResolvedValue(null);
  await expect(resolveCurrentSessionRole({ user: user({}, { role: "director" }) }))
    .resolves.toMatchObject({ role: null, source: "none" });
});

it("uses the current server role instead of a stale app metadata claim", async () => {
  rpc.mockResolvedValue("foreman");
  await expect(resolveCurrentSessionRole({ user: user({ role: "admin" }, { role: "admin" }) }))
    .resolves.toMatchObject({ role: "foreman", source: "rpc" });
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("fails closed on a server-role error instead of granting editable admin", async () => {
  rpc.mockRejectedValue(new Error("role unavailable"));
  await expect(resolveCurrentSessionRole({ user: user({}, { role: "admin" }) }))
    .rejects.toThrow("role unavailable");
});

it("uses the authoritative role after an explicitly requested profile warmup", async () => {
  rpc.mockResolvedValueOnce(null).mockResolvedValueOnce("buyer");
  await expect(resolveCurrentSessionRole({ user: user({}, { role: "admin" }), ensureProfile: true }))
    .resolves.toMatchObject({ role: "buyer", source: "rpc_after_profile", profileEnsured: true });
  expect(ensure).toHaveBeenCalledTimes(1);
});

it("observes a role revocation on the next resolution in the same session", async () => {
  rpc.mockResolvedValueOnce("director").mockResolvedValueOnce(null);
  const account = user({ role: "director" });
  await expect(resolveCurrentSessionRole({ user: account })).resolves.toMatchObject({ role: "director" });
  await expect(resolveCurrentSessionRole({ user: account })).resolves.toMatchObject({ role: null, source: "none" });
  expect(rpc).toHaveBeenCalledTimes(2);
});

it("refreshes the server role after a company change and clears the result on logout", async () => {
  rpc.mockResolvedValueOnce("foreman").mockResolvedValueOnce("buyer");
  const account = user({ role: "director" });
  await expect(resolveCurrentSessionRole({ user: account })).resolves.toMatchObject({ role: "foreman" });
  await expect(resolveCurrentSessionRole({ user: account, forceRefresh: true })).resolves.toMatchObject({ role: "buyer" });
  await expect(resolveCurrentSessionRole({ user: null })).resolves.toMatchObject({ userId: null, role: null });
});
