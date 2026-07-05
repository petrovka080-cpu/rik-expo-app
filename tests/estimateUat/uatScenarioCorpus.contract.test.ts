import {
  loadUatCriticalScenarios,
  validateUatScenarioCorpus,
} from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT scenario corpus", () => {
  it("expands to at least 150 scenarios and 60 real-browser critical cases", () => {
    const validation = validateUatScenarioCorpus();

    expect(validation.blockers).toEqual([]);
    expect(validation.uat_scenarios_created).toBe(true);
    expect(validation.uat_scenarios_count).toBeGreaterThanOrEqual(150);
    expect(validation.uat_critical_scenarios_count).toBeGreaterThanOrEqual(60);
    expect(loadUatCriticalScenarios()).toHaveLength(60);
    expect(validation.mandatory_uat_scenarios_included).toBe(true);
    expect(validation.all_major_work_groups_represented).toBe(true);
    expect(validation.negative_missing_input_cases_included).toBe(true);
    expect(validation.price_missing_cases_included).toBe(true);
  });
});
