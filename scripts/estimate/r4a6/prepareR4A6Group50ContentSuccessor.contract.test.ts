import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(
  "scripts/estimate/r4a6/prepareR4A6Group50ContentSuccessor.ts",
), "utf8");

describe("R4-A6 Group50 forward-only content successor", () => {
  it("keeps the predecessor immutable and creates successor-owned definitions", () => {
    expect(source).toContain("PREDECESSOR_RELEASE_ID");
    expect(source).toContain("new_definition_id");
    expect(source).toContain("supersedes_baseline_id");
    expect(source).not.toMatch(/update public\.estimate_(?:resource_spec|approved_template_baseline)\s+set/iu);
  });

  it("excludes included legacy filler and sanitizes empty optional text baselines", () => {
    expect(source).toContain("LEGACY_NON_PROFESSIONAL_EXCLUDED");
    expect(source).toContain("GENERIC_PUBLIC_NAME");
    expect(source).toContain("STRUCTURAL_PUBLIC_NAME");
    expect(source).toContain("source.input_values-coalesce(blank.optional_keys");
  });

  it("copies normative and price routing while requiring all blocking counters to be zero", () => {
    expect(source).toContain("estimate_work_normative_binding");
    expect(source).toContain("estimate_resource_price_route_binding");
    expect(source).toContain("Object.values(audit.blockingCounters).every");
  });
});
