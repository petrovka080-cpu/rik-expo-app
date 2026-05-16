import {
  GREEN_SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_READY,
  verifyForemanMutationWorkerDecomposition,
} from "../../scripts/architecture/verifyForemanMutationWorkerDecomposition";

describe("S_SCALE_07 foreman mutation worker decomposition", () => {
  it("keeps the foreman mutation worker below the god-file budget", () => {
    const verification = verifyForemanMutationWorkerDecomposition();

    expect(verification.final_status).toBe(
      GREEN_SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_READY,
    );
    expect(verification.findings).toEqual([]);
    expect(verification.metrics.originalMutationWorkerLines).toBe(1348);
    expect(verification.metrics.mutationWorkerCurrentLines).toBeLessThanOrEqual(
      verification.metrics.mutationWorkerLineBudget,
    );
    expect(verification.metrics.mutationWorkerUnderBudget).toBe(true);
    expect(verification.metrics.helperSurfaces).toBe(5);
    expect(verification.metrics.helperSurfacesPresent).toBe(true);
    expect(verification.metrics.newSourceModulesAdded).toBe(false);
    expect(verification.metrics.sourceModuleBudgetPreserved).toBe(true);
  });

  it("preserves the public offline worker contract while moving helpers out", () => {
    const verification = verifyForemanMutationWorkerDecomposition();

    expect(verification.metrics.publicEntrypointPreserved).toBe(true);
    expect(verification.metrics.replayPolicyExportPreserved).toBe(true);
    expect(
      verification.inventory.map((entry) => entry.role).sort(),
    ).toEqual([
      "conflict",
      "keys",
      "policy",
      "telemetry",
      "types",
    ]);
  });

  it("does not add UI, hooks, Supabase access, or fake-green claims", () => {
    const verification = verifyForemanMutationWorkerDecomposition();

    expect(verification.metrics.noHooksAdded).toBe(true);
    expect(verification.metrics.noUiImportsAdded).toBe(true);
    expect(verification.metrics.noSupabaseImportsAdded).toBe(true);
    expect(verification.metrics.businessLogicChanged).toBe(false);
    expect(verification.metrics.fakeGreenClaimed).toBe(false);
  });
});
