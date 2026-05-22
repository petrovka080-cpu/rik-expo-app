import {
  UnsafeProofFixtureOperationError,
  assertFixtureRowHasProofMarker,
  assertFixtureSeedAllowed,
  assertProofRunId,
} from "../../src/lib/proofFixtures/50kProofFixtureGuards";
import type { WholeApp50kProofRunId } from "../../src/lib/proofFixtures/50kProofFixtureTypes";

describe("whole-app 50k proof run id contract", () => {
  it("requires proof-prefixed proof_run_id values", () => {
    let value = "proof_50k_live_001";
    assertProofRunId(value);
    const typed: WholeApp50kProofRunId = value;

    expect(typed).toBe("proof_50k_live_001");
    expect(() => assertProofRunId("50k_live_001")).toThrow(UnsafeProofFixtureOperationError);
    expect(() => assertProofRunId("proof")).toThrow(UnsafeProofFixtureOperationError);
  });

  it("requires explicit seed flag plus proof_run_id before any seed mode", () => {
    expect(() => assertFixtureSeedAllowed({
      NODE_ENV: "test",
      ALLOW_WHOLE_APP_50K_FIXTURE_SEED: "1",
      WHOLE_APP_50K_PROOF_RUN_ID: "proof_50k_live_001",
    })).not.toThrow();

    expect(() => assertFixtureSeedAllowed({
      NODE_ENV: "test",
      WHOLE_APP_50K_PROOF_RUN_ID: "proof_50k_live_001",
    })).toThrow(UnsafeProofFixtureOperationError);
  });

  it("accepts any required proof marker form on synthetic rows", () => {
    const proofRunId = "proof_50k_live_001";

    expect(() => assertFixtureRowHasProofMarker({ proof_run_id: proofRunId }, proofRunId)).not.toThrow();
    expect(() => assertFixtureRowHasProofMarker({ payload: { proof_run_id: proofRunId } }, proofRunId)).not.toThrow();
    expect(() => assertFixtureRowHasProofMarker({ title: `[PROOF ${proofRunId}] request` }, proofRunId)).not.toThrow();
    expect(() => assertFixtureRowHasProofMarker({ storage_key: `fixtures/${proofRunId}/photo.jpg` }, proofRunId)).not.toThrow();
    expect(() => assertFixtureRowHasProofMarker({ title: "ordinary row" }, proofRunId)).toThrow(UnsafeProofFixtureOperationError);
  });
});
