import { spawnSync } from "node:child_process";

import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX,
} from "../../scripts/estimate/runAiEstimateNormativeCompletenessMatrix";

jest.setTimeout(600_000);

describe("AI estimate normative completeness matrix", () => {
  it("passes the 11610 normative parameter matrix", () => {
    const result = spawnSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/estimate/runAiEstimateNormativeCompletenessMatrix.ts"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 64,
        timeout: 600_000,
      },
    );
    expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout);

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX);
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.normative_passport_coverage).toBe("11610/11610");
    expect(summary.matrix_1000_random_passed).toBe("1000/1000");
    expect(summary.matrix_200_infrastructure_passed).toBe("200/200");
    expect(summary.matrix_100_repair_passed).toBe("100/100");
    expect(summary.matrix_100_expanded_complex_passed).toBe("100/100");
    expect(summary.matrix_100_critical_passed).toBe("100/100");
    expect(summary.matrix_50_missing_input_passed).toBe("50/50");
    expect(summary.matrix_50_quantity_trace_passed).toBe("50/50");
    expect(summary.blocking_reasons).toEqual([]);
  });
});
