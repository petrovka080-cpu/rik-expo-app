import fs from "fs";
import path from "path";

import { runGodComponentsDecompositionVerifier } from "../../scripts/architecture/verifyGodComponentsDecomposition";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readMatrix = () =>
  JSON.parse(
    fs.readFileSync(
      path.join(PROJECT_ROOT, "artifacts", "S_ARCH_01_GOD_COMPONENTS_DECOMPOSITION_matrix.json"),
      "utf8",
    ),
  ) as ReturnType<typeof runGodComponentsDecompositionVerifier>;

describe("S_ARCH_01 god components decomposition closeout", () => {
  it("has no current god-component or hook-pressure findings", () => {
    const report = runGodComponentsDecompositionVerifier(PROJECT_ROOT);

    expect(report.final_status).toBe("GREEN_ARCH_GOD_COMPONENTS_DECOMPOSITION_READY");
    expect(report.remaining_god_components).toBe(0);
    expect(report.hook_pressure_components_remaining).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.broad_exception_used).toBe(false);
  });

  it("keeps the tracked matrix aligned with the live scanner", () => {
    const report = runGodComponentsDecompositionVerifier(PROJECT_ROOT);
    const matrix = readMatrix();

    expect(matrix.final_status).toBe(report.final_status);
    expect(matrix.remaining_god_components).toBe(report.remaining_god_components);
    expect(matrix.hook_pressure_components_remaining).toBe(report.hook_pressure_components_remaining);
    expect(matrix.component_line_threshold).toBe(report.component_line_threshold);
    expect(matrix.hook_pressure_threshold).toBe(report.hook_pressure_threshold);
  });
});
