import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

describe("controlled pilot defect taxonomy", () => {
  it("classifies web and Android failures as P0 blockers", () => {
    const taxonomy = json<any>("data/estimate-pilot/pilot-defect-taxonomy.json");
    expect(taxonomy.acceptance.pilot_defect_taxonomy_created).toBe(true);
    expect(taxonomy.P0_BLOCKER).toEqual(expect.arrayContaining([
      "empty positions after valid prompt",
      "PDF snapshot mismatch",
      "web smoke failed",
      "Android emulator smoke failed",
    ]));
    expect(taxonomy.P1_HIGH.length).toBeGreaterThan(0);
    expect(taxonomy.P2_NORMAL.length).toBeGreaterThan(0);
    expect(taxonomy.classification_rules.web_smoke_failed).toBe("P0_BLOCKER");
    expect(taxonomy.classification_rules.android_emulator_smoke_failed).toBe("P0_BLOCKER");
  });
});
