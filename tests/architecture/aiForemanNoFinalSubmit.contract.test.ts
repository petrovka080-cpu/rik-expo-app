import fs from "node:fs";
import path from "node:path";

const files = [
  "src/features/ai/foreman/aiForemanEvidenceResolver.ts",
  "src/features/ai/foreman/aiForemanMissingEvidenceChecklist.ts",
  "src/features/ai/foreman/aiFieldCloseoutDraftEngine.ts",
  "src/features/ai/foreman/aiForemanApprovalCandidate.ts",
  "scripts/e2e/runAiForemanFieldCloseoutMaestro.ts",
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI foreman field closeout no-final-submit architecture", () => {
  it("keeps foreman closeout draft-only, provider-free, and mutation-free", () => {
    const combined = files.map(read).join("\n");

    expect(combined).toContain("finalSubmitAllowed: false");
    expect(combined).toContain("signingAllowed: false");
    expect(combined).toContain("directSubcontractMutationAllowed: false");
    expect(combined).toContain("executeOnlyAfterApprovedStatus: true");
    expect(combined).toContain("routeAiApprovalRequiredAction");
    expect(combined).not.toMatch(/finalSubmitAllowed:\s*true|signingAllowed:\s*true|directSubcontractMutationAllowed:\s*true/);
    expect(combined).not.toMatch(/reportPublished:\s*true|actSigned:\s*true|messageSent:\s*true|subcontractMutated:\s*true/);
    expect(combined).not.toMatch(/\bcreateClient\b|auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/);
    expect(combined).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/);
    expect(combined).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(combined).not.toMatch(/rawRowsReturned:\s*true|rawPromptReturned:\s*true|rawProviderPayloadReturned:\s*true/);
  });
});
