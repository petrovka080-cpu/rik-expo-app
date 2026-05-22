import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate OTA runtime matrix", () => {
  it("requires compatible fingerprint runtime and channel matrix", () => {
    const ota = getEnterpriseReleaseCandidateReport().ota;
    expect(ota.ota_runtime_compatible).toBe(true);
    expect(ota.build_channel_matrix_ready).toBe(true);
    expect(ota.blocker).toBeNull();
  });
});

