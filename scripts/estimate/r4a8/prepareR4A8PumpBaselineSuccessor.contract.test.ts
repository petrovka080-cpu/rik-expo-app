import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 pump empty-baseline successor", () => {
  const migration = readFileSync(resolve(
    "supabase/migrations/20260905140000_r4a8_empty_approved_baseline.sql",
  ), "utf8");
  const successor = readFileSync(resolve(
    "scripts/estimate/r4a8/prepareR4A8PumpBaselineSuccessor.ts",
  ), "utf8");

  it("permits only an exact empty provenance map set when no defaults exist", () => {
    expect(migration).toContain("not exists (select 1 from jsonb_object_keys(p_input_values))");
    for (const field of [
      "p_classification",
      "p_uom",
      "p_formula_consumers",
      "p_resource_consumers",
      "p_normative_sources",
      "p_guides",
    ]) {
      expect(migration).toContain(`${field} = '{}'::jsonb`);
    }
    expect(migration).toContain("exists (select 1 from jsonb_object_keys(p_input_values))");
    expect(migration).toContain("jsonb_array_length(p_resource_consumers->parameter_id) = 0");
  });

  it("adds no project value and retains immutable current monolith content", () => {
    expect(successor).toContain('const PREDECESSOR_RELEASE_ID = "73c11949-d5c9-5e41-8aba-d437ba31cdf6"');
    expect(successor).toContain("'{}'::jsonb,'{}'::jsonb,'{}'::jsonb");
    expect(successor).toContain("Number(pump.defaults) === 0");
    expect(successor).toContain("Number(pump.formulas) === 31");
    expect(successor).toContain("Number(pump.resources) === 31");
    expect(successor).toContain("from public.estimate_cumulative_manifest_entry where release_id=$3");
    expect(successor).toContain("insert into public.estimate_definition_version");
    expect(successor).toContain("insert into public.estimate_resource_spec");
    expect(successor).toContain("insert into public.estimate_work_normative_binding");
    expect(successor).toContain("insert into public.estimate_resource_price_route_binding");
    expect(successor).not.toContain("update public.estimate_definition_version");
    expect(successor).not.toContain("update public.estimate_parameter_definition");
  });

  it("keeps the successor local, prepared, and non-production", () => {
    expect(successor).toContain('lifecycle: "PREPARED_NOT_ACTIVE"');
    expect(successor).toContain("productionAccessed: false");
    expect(successor).toContain("deployPerformed: false");
    expect(successor).toContain("releasePerformed: false");
    expect(successor).toContain("activationPerformed: false");
  });
});
