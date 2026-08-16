import { readFileSync } from "node:fs";

describe("HVAC R4 activation migration", () => {
  it("qualifies the admission-seal lookup against the RETURNS TABLE release_id output", () => {
    const source = readFileSync(
      "supabase/migrations/20260816120000_batch007_hvac_r4.sql",
      "utf8",
    );

    expect(source).toContain(
      "select s.* into v_seal from public.estimate_domain_release_admission_seal as s",
    );
    expect(source).toContain(
      "where s.release_id = p_release_id and s.domain_id = 'hvac_heat_supply'",
    );
    expect(source).not.toContain(
      "where release_id = p_release_id and domain_id = 'hvac_heat_supply'",
    );
  });
});
