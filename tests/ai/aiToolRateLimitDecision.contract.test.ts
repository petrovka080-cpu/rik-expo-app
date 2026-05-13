import {
  decideAiToolRateLimit,
  measureAiToolPayloadBytes,
} from "../../src/features/ai/rateLimit/aiToolRateLimitDecision";
import { getAiToolBudgetPolicy } from "../../src/features/ai/rateLimit/aiToolBudgetPolicy";
import { getAiToolRateLimitPolicy } from "../../src/features/ai/rateLimit/aiToolRateLimitPolicy";

describe("AI tool rate-limit decision", () => {
  it("allows an in-budget role-scoped safe read", () => {
    const decision = decideAiToolRateLimit({
      toolName: "search_catalog",
      role: "buyer",
      payloadBytes: measureAiToolPayloadBytes({ query: "cement", limit: 10 }),
      requestedLimit: 10,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("allowed");
    expect(decision.rateLimitScope).toBe("ai.tool.search_catalog");
    expect(decision.realUserBlockingEnabled).toBe(false);
    expect(decision.runtimeProviderRequiredForBlocking).toBe(true);
  });

  it("blocks unknown roles and unknown tools", () => {
    expect(
      decideAiToolRateLimit({
        toolName: "search_catalog",
        role: "unknown",
      }).reason,
    ).toBe("role_not_allowed");

    expect(
      decideAiToolRateLimit({
        toolName: "delete_everything",
        role: "director",
      }).reason,
    ).toBe("tool_not_registered");
  });

  it("blocks oversized payloads and result limits above budget", () => {
    const budget = getAiToolBudgetPolicy("compare_suppliers");

    expect(
      decideAiToolRateLimit({
        toolName: "compare_suppliers",
        role: "buyer",
        payloadBytes: (budget?.maxPayloadBytes ?? 0) + 1,
        requestedLimit: 1,
      }).reason,
    ).toBe("payload_too_large");

    expect(
      decideAiToolRateLimit({
        toolName: "compare_suppliers",
        role: "buyer",
        requestedLimit: (budget?.maxResultLimit ?? 0) + 1,
      }).reason,
    ).toBe("result_limit_exceeded");
  });

  it("blocks retry and window overages", () => {
    const policy = getAiToolRateLimitPolicy("search_catalog");
    const budget = getAiToolBudgetPolicy("search_catalog");

    expect(
      decideAiToolRateLimit({
        toolName: "search_catalog",
        role: "buyer",
        retryAttempt: (budget?.maxRetriesPerRequest ?? 0) + 1,
      }).reason,
    ).toBe("retry_budget_exceeded");

    expect(
      decideAiToolRateLimit({
        toolName: "search_catalog",
        role: "buyer",
        requestCountInWindow: (policy?.maxRequestsPerMinute ?? 0) + (policy?.burst ?? 0) + 1,
      }).reason,
    ).toBe("window_budget_exceeded");
  });

  it("requires idempotency and evidence for submit_for_approval", () => {
    expect(
      decideAiToolRateLimit({
        toolName: "submit_for_approval",
        role: "buyer",
        requestedLimit: 1,
        evidenceRefs: ["draft:1"],
      }).reason,
    ).toBe("idempotency_key_required");

    expect(
      decideAiToolRateLimit({
        toolName: "submit_for_approval",
        role: "buyer",
        requestedLimit: 1,
        idempotencyKey: "approval:demo",
        evidenceRefs: [],
      }).reason,
    ).toBe("evidence_required");

    expect(
      decideAiToolRateLimit({
        toolName: "submit_for_approval",
        role: "buyer",
        requestedLimit: 1,
        idempotencyKey: "approval:demo",
        evidenceRefs: ["draft:1"],
      }).allowed,
    ).toBe(true);
  });
});
