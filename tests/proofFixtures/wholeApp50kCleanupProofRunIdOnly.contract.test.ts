import {
  UnsafeProofFixtureOperationError,
  assertDeleteScopedByProofRunId,
} from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k cleanup scope contract", () => {
  it("allows cleanup only when delete statements are proof-scoped", () => {
    expect(() => assertDeleteScopedByProofRunId(
      "delete from public.ai_action_ledger where redacted_payload ->> 'proof_run_id' = $1",
    )).not.toThrow();
    expect(() => assertDeleteScopedByProofRunId(
      "delete from public.consumer_repair_request_drafts where title like $1 or problem_text like $2",
    )).not.toThrow();
    expect(() => assertDeleteScopedByProofRunId("delete from public.consumer_repair_request_drafts where id = $1")).toThrow(
      UnsafeProofFixtureOperationError,
    );
  });
});
