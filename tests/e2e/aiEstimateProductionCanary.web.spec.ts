import { expect, test } from "playwright/test";

import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import {
  buildAiEstimateCanaryConfig,
  recordAiEstimateFeedback,
  resolveAiEstimateCanaryEligibility,
} from "../../src/lib/ai/productionCanary";
import { writeProductionCanaryWebArtifacts } from "../../scripts/e2e/aiEstimateProductionCanaryCore";

test.describe("AI estimate production canary control plane", () => {
  test("keeps canary default-off while allowing internal opt-in and kill-switch rollback", () => {
    const defaultEligibility = resolveAiEstimateCanaryEligibility({
      isInternalStaff: true,
      manualOptIn: true,
      percentBucket: 0,
    });
    const internalOptIn = resolveAiEstimateCanaryEligibility({
      config: buildAiEstimateCanaryConfig({ internal_canary_enabled: true }),
      isInternalStaff: true,
      manualOptIn: true,
      percentBucket: 0,
    });
    const killSwitch = applyAiEstimateKillSwitchPolicy({
      policy: {
        disable_all_ai_estimates: true,
        disable_request_ai_estimate: false,
        disable_embedded_ai_estimate: false,
        disable_dynamic_boq_compiler: false,
        disable_pdf_generation: false,
        disable_catalog_binding: false,
        disable_local_rate_source_lookup: false,
        disable_regulated_work_estimates: false,
        fallback_to_safe_triage_only: false,
      },
      entrypoint: "request",
      action: "estimate",
    });
    const pdfKillSwitch = applyAiEstimateKillSwitchPolicy({
      policy: {
        disable_all_ai_estimates: false,
        disable_request_ai_estimate: false,
        disable_embedded_ai_estimate: false,
        disable_dynamic_boq_compiler: false,
        disable_pdf_generation: true,
        disable_catalog_binding: false,
        disable_local_rate_source_lookup: false,
        disable_regulated_work_estimates: false,
        fallback_to_safe_triage_only: false,
      },
      entrypoint: "embedded_ai",
      action: "pdf",
    });

    expect(defaultEligibility.eligible).toBe(false);
    expect(defaultEligibility.status).toBe("disabled");
    expect(internalOptIn.eligible).toBe(true);
    expect(killSwitch.blocked).toBe(true);
    expect(pdfKillSwitch.blocked).toBe(true);
  });

  test("runs production-canary web estimate samples with telemetry and feedback capture", () => {
    const web = writeProductionCanaryWebArtifacts();
    expect(web.web_flows_passed).toBe(true);
    expect(web.route_split.request).toBeGreaterThan(0);
    expect(web.route_split.ai_foreman).toBeGreaterThan(0);
    expect(web.route_split.ai_request).toBeGreaterThan(0);
    const firstResult = web.results[0];
    const feedback = recordAiEstimateFeedback({
      runtimeTraceId: String(firstResult.runtimeTraceId ?? "trace_missing"),
      entrypoint: firstResult.route,
      classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
      visibleWorkTitle: "linoleum_laying",
      rowCount: Number(firstResult.rowCount),
      reason: "wrong_units",
      optionalUserComment: "call +1 555 222 1111 should be redacted",
    });

    expect(feedback.valid).toBe(true);
    expect(feedback.optionalUserComment).toContain("[redacted_phone]");
  });
});
