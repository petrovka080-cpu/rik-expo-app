import {
  aiEstimateSmokeHarnessContract,
  buildAiEstimateCorpusFingerprint,
  runAiEstimateSmokeCases,
  shouldRetryAiEstimateSmokeFailure,
} from "../../scripts/e2e/aiEstimateSmokeHarness";

describe("AI estimate reusable smoke harness", () => {
  it("has strict evidence and retry policy", async () => {
    const contract = aiEstimateSmokeHarnessContract();

    expect(contract.web_smoke_harness_created).toBe(true);
    expect(contract.android_chrome_harness_created).toBe(true);
    expect(contract.case_results_jsonl_created).toBe(true);
    expect(contract.business_failure_not_retried_as_transient).toBe(true);
    expect(contract.cdp_transport_retry_bounded).toBe(true);
    expect(contract.console_error_policy_strict).toBe(true);
    expect(contract.corpus_fingerprint_recorded).toBe(true);
    expect(shouldRetryAiEstimateSmokeFailure({ failureType: "business", attempt: 1, maxTransportRetries: 2 })).toBe(false);
    expect(shouldRetryAiEstimateSmokeFailure({ failureType: "cdp_transport", attempt: 3, maxTransportRetries: 2 })).toBe(false);

    const cases = [{
      case_id: "request:renovation:create_draft",
      entrypoint: "request",
      flow: "create_draft",
      snapshot_hash: "snapshot",
      pdf_buyer_hash: "pdf",
      history_count_hash: "history",
      foreman_entry_hash: "foreman",
    }];
    const results = await runAiEstimateSmokeCases({
      target: "web",
      cases,
      executeCase: async () => ({ passed: false, blockers: ["business_failure"], failureType: "business" }),
    });

    expect(results[0].attempts).toBe(1);
    expect(results[0].passed).toBe(false);
    expect(buildAiEstimateCorpusFingerprint(cases)).toHaveLength(8);
  });
});
