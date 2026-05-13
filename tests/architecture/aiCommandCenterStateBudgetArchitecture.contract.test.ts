import { evaluateAiCommandCenterStateBudgetGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI Command Center state budget architecture", () => {
  it("keeps Command Center bounded, non-realtime by default, and mutation-free", () => {
    const result = evaluateAiCommandCenterStateBudgetGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_command_center_state_budget",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      budgetFilesPresent: true,
      scannerPresent: true,
      e2eRunnerPresent: true,
      artifactsPresent: true,
      maxCardsBounded: true,
      paginationRequired: true,
      refreshThrottleRequired: true,
      refreshTimeoutRequired: true,
      cancellationRequired: true,
      duplicateInFlightBlocked: true,
      realtimeDisabledByDefault: true,
      perCardRealtimeDisabled: true,
      noRealtimeSubscriptionInCommandCenter: true,
      noPollingLoopInCommandCenter: true,
      taskStreamUsesBudgetedLimit: true,
      cardBudgetEnforced: true,
      realEmptyState: true,
      noMutationSurface: true,
    });
  });
});
