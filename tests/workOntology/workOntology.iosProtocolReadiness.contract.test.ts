import { buildIosProtocolReadiness } from "./workOntologyTestHelpers";

describe("work ontology iOS protocol readiness", () => {
  it("records protocol coverage without claiming an iOS/TestFlight build", () => {
    const readiness = buildIosProtocolReadiness();
    expect(readiness.final_status).toBe("GREEN_WORK_ONTOLOGY_IOS_PROTOCOL_READY_WITHOUT_BUILD");
    expect(readiness.ios_build_started).toBe(false);
    expect(readiness.eas_build_started).toBe(false);
    expect(readiness.testflight_started).toBe(false);
    expect(readiness.estimate_core_protocol_covered).toBe(true);
    expect(readiness.no_ios_runtime_claimed).toBe(true);
  });
});
