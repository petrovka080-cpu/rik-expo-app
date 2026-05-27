import { runChangeControlScenario } from "./changeControlTestHelpers";

describe("change control - golden cases", () => {
  it("runs impacted golden cases during validation before publish", () => {
    const { store } = runChangeControlScenario();
    expect(store.validation_runs.some((run) => Number(run.result_payload.golden_cases_run) > 0)).toBe(true);
    const published = store.audit_log.find((event) => event.action === "published");
    expect(published).toBeDefined();
    expect(store.validation_runs.some((run) => run.change_id === published?.change_id && run.status === "passed")).toBe(true);
  });
});
