import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("live web build identity proof", () => {
  it("records expected and live identity fields", () => {
    const identity = readRestoreProofJson("live_web_build_identity.json");
    expect(typeof identity.expected_commit).toBe("string");
    expect(String(identity.expected_commit)).toMatch(/^[0-9a-f]{40}$/);
    expect(identity.stale_service_worker_bundle_detected).toBe(false);
    expectNoFakeGreen(identity, "live_web_build_identity.json");
  });
});
