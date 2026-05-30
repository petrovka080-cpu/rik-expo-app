import { expect, test } from "playwright/test";

import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import {
  buildInternalCanaryEnabledConfig,
  recordAiEstimateUserFeedback,
  resolveInternalCanaryEligibility,
} from "../../src/lib/ai/productionCanary";
import { writeInternalCanaryWebArtifacts } from "../../scripts/e2e/aiEstimateInternalCanaryCore";

test.describe("AI estimate internal canary execution", () => {
  test("keeps public rollout off while allowing explicit internal opt-in", () => {
    const disabled = resolveInternalCanaryEligibility({
      internalStaffFlag: true,
      manualOptIn: true,
      percentBucket: 0,
    });
    const internal = resolveInternalCanaryEligibility({
      config: buildInternalCanaryEnabledConfig(),
      internalStaffFlag: true,
      manualOptIn: true,
      percentBucket: 0,
    });
    const publicUser = resolveInternalCanaryEligibility({
      config: buildInternalCanaryEnabledConfig(),
      internalStaffFlag: false,
      manualOptIn: true,
      percentBucket: 0,
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
      entrypoint: "request",
      action: "pdf",
    });

    expect(disabled.eligible).toBe(false);
    expect(disabled.status).toBe("disabled");
    expect(internal.eligible).toBe(true);
    expect(publicUser.status).toBe("blocked_external_user");
    expect(pdfKillSwitch.blocked).toBe(true);
  });

  test("runs internal canary web estimate samples with telemetry and feedback capture", () => {
    const web = writeInternalCanaryWebArtifacts();
    expect(web.web_flows_passed).toBe(true);
    expect(web.route_split.request).toBe(4);
    expect(web.route_split.ai_foreman).toBe(4);
    expect(web.route_split.ai_request).toBe(2);
    const firstResult = web.results[0];
    const feedback = recordAiEstimateUserFeedback({
      runtimeTraceId: String(firstResult.runtimeTraceId ?? "trace_missing"),
      entrypoint: firstResult.route,
      workTitle: "linoleum_laying",
      domain: firstResult.domain,
      object: String(firstResult.object ?? "floor_covering"),
      operation: String(firstResult.operation ?? "installation"),
      rowCount: Number(firstResult.rowCount),
      pdfGenerated: false,
      userFeedbackCategory: "wrong_units",
      optionalComment: "phone +1 555 222 1111 must be redacted",
      createdAt: "2026-05-30T00:00:00.000Z",
    });

    expect(feedback.valid).toBe(true);
    expect(feedback.optionalComment).toContain("[redacted_phone]");
  });
});
