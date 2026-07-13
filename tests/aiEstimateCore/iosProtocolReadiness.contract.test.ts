import {
  nativeEstimateCoreDiffPaths,
  readWaveArtifact,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core iOS protocol readiness without build", () => {
  it("keeps this wave JS/TS-only and does not require iOS/EAS/TestFlight", () => {
    expect(nativeEstimateCoreDiffPaths()).toEqual([]);

    const artifact = readWaveArtifact<Record<string, unknown>>("ios_protocol_readiness.json");
    if (artifact) {
      expect(artifact).toMatchObject({
        ios_build_started: false,
        eas_build_started: false,
        testflight_started: false,
        native_ios_files_changed: false,
        requires_new_ios_build: false,
        estimate_core_protocol_covered: true,
        selected_work_protocol_covered: true,
        quantity_parser_protocol_covered: true,
        boq_protocol_covered: true,
        pdf_protocol_covered: true,
        catalog_binding_protocol_covered: true,
        fake_ios_green_claimed: false,
        fake_green_claimed: false,
      });
    }
  });
});
