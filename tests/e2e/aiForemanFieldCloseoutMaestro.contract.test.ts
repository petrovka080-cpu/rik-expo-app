import fs from "node:fs";
import path from "node:path";

describe("AI foreman field closeout Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiForemanFieldCloseoutMaestro.ts"),
    "utf8",
  );

  it("writes redacted S_AI_FOREMAN_01 artifacts and carries exact green/blocker statuses", () => {
    expect(source).toContain('const wave = "S_AI_FOREMAN_01_FIELD_CLOSEOUT_DRAFT_ENGINE"');
    expect(source).toContain("GREEN_AI_FOREMAN_FIELD_CLOSEOUT_DRAFT_ENGINE_READY");
    expect(source).toContain("BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY");
    expect(source).toContain("resolveAiForemanEvidence");
    expect(source).toContain("buildAiForemanMissingEvidenceChecklist");
    expect(source).toContain("buildAiFieldCloseoutDraftEngine");
    expect(source).toContain("buildAiForemanApprovalCandidate");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("getAgentFieldContext");
    expect(source).not.toMatch(/S_AI_MAGIC_WAVES_APPROVED|REQUIRED_FLAGS|flagsReady|envEnabled/);
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(source).not.toMatch(/final_submit:\s*true|signing:\s*true|direct_subcontract_mutation:\s*true/i);
    expect(source).not.toMatch(/report_published:\s*true|act_signed:\s*true|message_sent:\s*true/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
  });
});
