import {
  createAiEstimatePerformanceEvent,
  validateAiEstimatePerformanceEvents,
} from "../../src/lib/platform/aiEstimatePerformanceTelemetry";

describe("AI estimate performance telemetry", () => {
  it("redacts PII and requires source sha operation and duration", () => {
    const sourceSha = "test-source-sha";
    const events = [
      createAiEstimatePerformanceEvent({
        eventName: "ai_estimate_prompt_started",
        operation: "prompt_to_template_match",
        durationMs: 1,
        sourceSha,
        routeOrSurface: "/request",
        prompt: "call +996 555 123456 or user@example.com for estimate",
      }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_template_matched", operation: "prompt_to_template_match", durationMs: 1, sourceSha, routeOrSurface: "/request" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_boq_built", operation: "full_boq_build", durationMs: 1, sourceSha, routeOrSurface: "/request" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_costing_built", operation: "trusted_costing", durationMs: 1, sourceSha, routeOrSurface: "/request" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_pdf_built", operation: "pdf_package_generation", durationMs: 1, sourceSha, routeOrSurface: "/request" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_buyer_handoff_built", operation: "buyer_handoff_generation", durationMs: 1, sourceSha, routeOrSurface: "/request" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_history_page_loaded", operation: "approved_history_page_load", durationMs: 1, sourceSha, routeOrSurface: "/request/history" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_foreman_entry_opened", operation: "foreman_materials_estimate_open", durationMs: 1, sourceSha, routeOrSurface: "/office/foreman" }),
      createAiEstimatePerformanceEvent({ eventName: "ai_estimate_slo_violation_detected", operation: "draft_estimate_build", durationMs: 1600, sourceSha, routeOrSurface: "/request" }),
    ];
    const validation = validateAiEstimatePerformanceEvents(events);

    expect(JSON.stringify(events)).not.toContain("user@example.com");
    expect(JSON.stringify(events)).not.toContain("+996 555 123456");
    expect(validation.performance_telemetry_schema_created).toBe(true);
    expect(validation.all_events_have_duration).toBe(true);
    expect(validation.all_events_have_source_sha).toBe(true);
    expect(validation.pii_redaction_passed).toBe(true);
    expect(validation.full_prompt_not_logged_unredacted).toBe(true);
    expect(validation.passed).toBe(true);
  });
});
