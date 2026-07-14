import { execFileSync } from "node:child_process";
import path from "node:path";
import { S2B_INFRASTRUCTURE_FAMILY_MANIFEST } from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";

describe("S2B full manifest coverage", () => {
  it("passes the release audit with zero software blocker counters", () => {
    const output = execFileSync(process.execPath, [path.join(process.cwd(), "node_modules/tsx/dist/cli.cjs"), "scripts/release/auditS2bInfrastructureEngineeringProfessionalTruth.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const summary = JSON.parse(output);

    expect(S2B_INFRASTRUCTURE_FAMILY_MANIFEST).toHaveLength(18);
    expect(summary.family_total).toBe(18);
    expect(summary.family_ready).toBe(18);
    expect(summary.family_blocked).toBe(0);
    expect(summary.generic_depth_used_as_professional).toBe(0);
    expect(summary.wrong_calculator_binding).toBe(0);
    expect(summary.missing_p0_schema).toBe(0);
    expect(summary.missing_domain_blocks).toBe(0);
    expect(summary.wrong_units).toBe(0);
    expect(summary.duplicate_codes).toBe(0);
    expect(summary.missing_formula_trace).toBe(0);
    expect(summary.fake_price_count).toBe(0);
    expect(summary.unsafe_final_count).toBe(0);
    expect(summary.status).toBe("GREEN_S2B_SOFTWARE_IMPLEMENTATION_READY_FOR_DOMAIN_EXPERT_REVIEW_NO_RELEASE");
  });
});
