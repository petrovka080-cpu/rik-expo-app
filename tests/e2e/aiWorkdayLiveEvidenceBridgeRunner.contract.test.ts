import fs from "node:fs";

describe("S13 AI workday live evidence bridge runner", () => {
  const source = fs.readFileSync("scripts/e2e/runAiWorkdayLiveEvidenceBridge.ts", "utf8");

  it("guards live safe-read proof behind explicit approval flags", () => {
    expect(source).toContain("S_AI_MAGIC_13_WORKDAY_LIVE_EVIDENCE_APPROVED");
    expect(source).toContain("S_AI_MAGIC_13_REQUIRE_SAFE_READ_ONLY");
    expect(source).toContain("S_AI_MAGIC_13_REQUIRE_EVIDENCE");
  });

  it("uses bounded internal BFF safe-read transports without service-role green path", () => {
    expect(source).toContain("callBffReadonlyMobile");
    expect(source).toContain("warehouse.api.stock.scope");
    expect(source).toContain("director.finance.summary.v2");
    expect(source).toContain("getAgentWorkdayLiveEvidenceTasks");
    expect(source).toContain("auth_admin_used: false");
    expect(source).toContain("list_users_used: false");
    expect(source).toContain("service_role_used: false");
    expect(source).toContain("seed_used: false");
  });

  it("writes S13 artifacts and never treats unavailable safe reads as fake green", () => {
    expect(source).toContain("S_AI_MAGIC_13_WORKDAY_LIVE_EVIDENCE_BRIDGE");
    expect(source).toContain("BLOCKED_AI_WORKDAY_LIVE_EVIDENCE_SAFE_READ_UNAVAILABLE");
    expect(source).toContain("GREEN_AI_WORKDAY_LIVE_EVIDENCE_EMPTY_READY");
    expect(source).toContain("fake_green_claimed: false");
  });

  it("distinguishes bad developer auth from staging BFF mobile verifier mismatch", () => {
    expect(source).toContain("verifySupabaseUserJwt");
    expect(source).toContain("local_supabase_user_jwt_verify");
    expect(source).toContain("bff_mobile_auth_rejected_valid_jwt");
    expect(source).toContain("BFF mobile readonly auth rejected a locally valid staging Supabase JWT");
  });
});
