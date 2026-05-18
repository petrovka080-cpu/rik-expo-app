import { runGodComponentsDecompositionVerifier } from "../../scripts/architecture/verifyGodComponentsDecomposition";

describe("no new god components", () => {
  it("fails if any component crosses the line or hook thresholds", () => {
    const report = runGodComponentsDecompositionVerifier();

    expect(report.remaining_god_components).toBe(0);
    expect(report.new_god_components_added).toBe(0);
    expect(report.hook_pressure_components_remaining).toBe(0);
    expect(report.top_by_lines.every((entry) => entry.lineCount < report.component_line_threshold)).toBe(true);
    expect(report.top_by_hooks.every((entry) => entry.hookCount < report.hook_pressure_threshold)).toBe(true);
  });
});
