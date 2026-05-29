import fs from "node:fs";
import path from "node:path";

import {
  buildExternalLiveProofCloseoutPlan,
  redactLiveProofOutput,
} from "../../scripts/audit/externalLiveProofCloseout.shared";

describe("external live proof closeout harness", () => {
  it("blocks live closeout until both proof database URLs and explicit opt-ins are present", () => {
    const plan = buildExternalLiveProofCloseoutPlan({});

    expect(plan.can_run_all_live_proofs).toBe(false);
    expect(plan.fake_green_claimed).toBe(false);
    expect(plan.missing_requirements).toEqual(expect.arrayContaining([
      "SUPABASE_RLS_PROOF_DATABASE_URL",
      "ALLOW_RLS_DYNAMIC_MUTATION_PROOF=1",
      "WHOLE_APP_50K_DATABASE_URL or SUPABASE_WHOLE_APP_50K_DATABASE_URL",
      "ALLOW_WHOLE_APP_50K_LIVE_PROOF=1",
    ]));
    expect(plan.steps.map((step) => step.runner)).toEqual([
      "scripts/audit/runRlsDynamicCrossTenantProof.ts",
      "scripts/e2e/runWholeApp50kExplainP95Proof.ts",
      "scripts/audit/runFinal50k92ScoreReaudit.ts",
    ]);
  });

  it("switches to live runners only with exact DB env and opt-ins", () => {
    const plan = buildExternalLiveProofCloseoutPlan({
      SUPABASE_RLS_PROOF_DATABASE_URL: "postgres://user:secret@example/db",
      ALLOW_RLS_DYNAMIC_MUTATION_PROOF: "1",
      WHOLE_APP_50K_DATABASE_URL: "postgres://user:secret@example/db",
      ALLOW_WHOLE_APP_50K_LIVE_PROOF: "1",
    });

    expect(plan.can_run_all_live_proofs).toBe(true);
    expect(plan.missing_requirements).toEqual([]);
    expect(plan.steps.map((step) => step.runner)).toEqual([
      "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts",
      "scripts/e2e/runWholeApp50kExplainP95LiveProof.ts",
      "scripts/audit/runFinal50k92ScoreReaudit.ts",
    ]);
  });

  it("redacts live proof output and does not depend on service_role frontend keys", () => {
    const cliPath = path.join(process.cwd(), "scripts/audit/runExternalLiveProofCloseout.ts");
    const sharedPath = path.join(process.cwd(), "scripts/audit/externalLiveProofCloseout.shared.ts");
    const cliSource = fs.readFileSync(cliPath, "utf8");
    const sharedSource = fs.readFileSync(sharedPath, "utf8");

    const redacted = redactLiveProofOutput([
      "postgres://u:p@example/db",
      "password=hunter2",
      "SUPABASE_SERVICE_ROLE_KEY=secret",
      "apikey=public-secret",
      "authorization=Bearer abc.def.ghi",
      "Bearer eyJaaaaaaaaaa.bbbbbbbbbb.cccccccccc",
      "connect ETIMEDOUT 203.0.113.10:5432",
      "consumer@example.com",
      "+996 555 123 456",
    ].join(" "));

    expect(redacted)
      .toContain("postgres://[redacted]@");
    expect(redacted).toContain("password=[redacted]");
    expect(redacted).toContain("SUPABASE_SERVICE_ROLE_KEY=[redacted]");
    expect(redacted).toContain("apikey=[redacted]");
    expect(redacted).toContain("authorization=[redacted]");
    expect(redacted).toContain("Bearer [redacted]");
    expect(redacted).toContain("connect ETIMEDOUT [redacted-host]");
    expect(redacted).toContain("[redacted-email]");
    expect(redacted).toContain("[redacted-phone]");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("public-secret");
    expect(redacted).not.toContain("203.0.113.10");
    expect(redacted).not.toContain("consumer@example.com");
    expect(redacted).not.toContain("+996 555 123 456");
    expect(sharedSource).toContain("runRlsDynamicCrossTenantLiveProof.ts");
    expect(sharedSource).toContain("runWholeApp50kExplainP95LiveProof.ts");
    expect(sharedSource).toContain("runFinal50k92ScoreReaudit.ts");
    expect(cliSource).toContain("fake_green_claimed");
    expect(cliSource).toContain("EXTERNAL_LIVE_PROOF_STEP_TIMEOUT_MS");
    expect(cliSource).toContain("BLOCKED_EXTERNAL_LIVE_PROOF_TIMEOUT");
    expect(cliSource).toContain("taskkill");
    expect(cliSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
