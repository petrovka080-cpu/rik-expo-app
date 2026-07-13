import { resolveIosRuntimeFingerprint } from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight runtime fingerprint guard", () => {
  it("resolves the iOS runtime fingerprint locally before EAS is allowed", () => {
    const fingerprint = resolveIosRuntimeFingerprint();

    expect(fingerprint.command_ok).toBe(true);
    expect(fingerprint.runtime_version).toMatch(/^[a-f0-9]{40}$/);
    expect(fingerprint.fingerprint_sources_count).toBeGreaterThan(0);
  });
});
