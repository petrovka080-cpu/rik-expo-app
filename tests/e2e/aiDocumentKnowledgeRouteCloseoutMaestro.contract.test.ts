import fs from "node:fs";
import path from "node:path";

describe("AI document knowledge route closeout Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiDocumentKnowledgeRouteCloseoutMaestro.ts"),
    "utf8",
  );

  it("writes S_AI_DOCUMENTS_01 artifacts with exact green and blocker statuses", () => {
    expect(source).toContain('const wave = "S_AI_DOCUMENTS_01_DOCUMENT_KNOWLEDGE_ROUTE_CLOSEOUT"');
    expect(source).toContain("GREEN_AI_DOCUMENT_KNOWLEDGE_ROUTE_READY");
    expect(source).toContain("BLOCKED_DOCUMENTS_MAIN_ROUTE_NOT_REGISTERED");
    expect(source).toContain("BLOCKED_AI_DOCUMENT_EVIDENCE_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_DOCUMENT_RUNTIME_TARGETABILITY");
    expect(source).toContain('const inventoryPath = `${artifactPrefix}_inventory.json`');
    expect(source).toContain('const matrixPath = `${artifactPrefix}_matrix.json`');
    expect(source).toContain('const emulatorPath = `${artifactPrefix}_emulator.json`');
    expect(source).toContain('const proofPath = `${artifactPrefix}_proof.md`');
  });

  it("uses document route registry, evidence, knowledge policy, forbidden policy, and Android smoke", () => {
    expect(source).toContain("verifyAiDocumentRouteRegistry");
    expect(source).toContain("resolveAiDocumentEvidence");
    expect(source).toContain("buildAiDocumentKnowledgePolicy");
    expect(source).toContain("listAiDocumentForbiddenActionPolicies");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("documents_main_ui_route_registered: false");
    expect(source).toContain("documents_main_closed_by_canonical_alias");
  });

  it("does not use service role, admin auth, providers, fake docs, or direct mutations", () => {
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(source).not.toMatch(/no_fake_docs:\s*false|fake_green_claimed:\s*true/i);
    expect(source).not.toMatch(/no_signing:\s*false|no_final_submit:\s*false|no_document_deletion:\s*false/i);
    expect(source).not.toMatch(/final_execution:\s*[1-9]|mutation_count:\s*[1-9]|db_writes:\s*[1-9]/i);
  });
});
