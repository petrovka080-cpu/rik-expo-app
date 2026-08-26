import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20260822130000_r4_professional_sign_off_overlay.sql",
);

describe("R4 professional sign-off overlay migration", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  it("keeps technical content admission fail-closed on exact persisted counts", () => {
    expect(source).toContain("estimate_content_passport_software_ready_r4");
    expect(source).toContain("manifest.baseline_ready");
    expect(source).toContain("manifest.scenario_ready");
    expect(source).toContain("definition.content_gate_status='GREEN'");
    expect(source).toContain("passport.parameter_count=(");
    expect(source).toContain("passport.formula_count=(");
    expect(source).toContain("passport.resource_count=(");
  });

  it("does not manufacture or weaken professional acceptance records", () => {
    expect(source).not.toMatch(/insert\s+into\s+public\.estimate_technology_passport_acceptance_r3/i);
    expect(source).not.toMatch(/update\s+public\.estimate_technology_passport_acceptance_r3/i);
    expect(source).not.toContain("create or replace function public.estimate_technology_passport_exact_accepted_r3");
    expect(source).not.toContain("create or replace function public.estimate_record_technology_acceptance_r3");
    expect(source).toContain("creates no acceptance");
  });

  it("removes the human-signature predicate only from software promotion", () => {
    const promotion = source.slice(
      source.indexOf("create or replace function public.estimate_enforce_content_gate_promotion_r3"),
    );
    expect(promotion).not.toContain("estimate_technology_passport_any_exact_accepted_r3");
    expect(promotion).not.toContain("HUMAN_ACCEPTANCE_MISSING");
    expect(source).toContain("professional sign-off remains a separate immutable R3 overlay");
  });
});
