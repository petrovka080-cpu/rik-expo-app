import {
  evaluateWholeApp50kFixtureSufficiency,
} from "../../src/lib/proofFixtures/50kProofFixtureMatrix";

describe("whole-app 50k fixture sufficiency contract", () => {
  it("requires full synthetic row volume and one proof owner user", () => {
    expect(evaluateWholeApp50kFixtureSufficiency()).toMatchObject({
      fixtureSufficient: false,
      blocker: "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED",
    });

    expect(evaluateWholeApp50kFixtureSufficiency({
      proofOwnerUserPresent: false,
      counts: {
        b2cRequests: 50000,
        b2cRequestItems: 250000,
        mediaRows: 100000,
        pdfRows: 50000,
        marketplaceListings: 50000,
        events: 1000000,
      },
    })).toMatchObject({
      fixtureSufficient: false,
      blocker: "BLOCKED_EXTERNAL_ONLY_PROOF_OWNER_USER_REQUIRED",
    });

    expect(evaluateWholeApp50kFixtureSufficiency({
      counts: {
        b2cRequests: 50000,
        b2cRequestItems: 250000,
        mediaRows: 100000,
        pdfRows: 50000,
        marketplaceListings: 50000,
        events: 1000000,
      },
    })).toMatchObject({
      fixtureSufficient: true,
      blocker: undefined,
    });
  });
});
