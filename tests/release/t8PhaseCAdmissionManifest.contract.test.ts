import fs from "node:fs";
import path from "node:path";

import {
  T8_PHASE_C_ADMISSION_SUITES,
  T8_PHASE_C_EXPECTED_ROOT_CAUSES,
  T8_PHASE_C_MIN_SUITES,
  T8_PHASE_C_MIN_TESTS,
  T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES,
} from "../../scripts/release/t8PhaseCAdmissionManifest";

describe("T8 Phase C admission manifest", () => {
  it("owns exactly one primary producer regression for every root cause", () => {
    expect(Object.keys(T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES)).toHaveLength(
      T8_PHASE_C_EXPECTED_ROOT_CAUSES,
    );
    expect(new Set(Object.values(T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES)).size).toBe(
      T8_PHASE_C_EXPECTED_ROOT_CAUSES,
    );
  });

  it("keeps the focused gate broad, exact, and executable", () => {
    expect(T8_PHASE_C_ADMISSION_SUITES).toHaveLength(T8_PHASE_C_MIN_SUITES);
    expect(new Set(T8_PHASE_C_ADMISSION_SUITES).size).toBe(T8_PHASE_C_ADMISSION_SUITES.length);
    expect(T8_PHASE_C_MIN_TESTS).toBe(260);
    for (const suite of T8_PHASE_C_ADMISSION_SUITES) {
      expect(fs.existsSync(path.resolve(process.cwd(), suite))).toBe(true);
      expect(suite).not.toMatch(/\*|\.skip\.|\.only\./);
    }
  });
});
