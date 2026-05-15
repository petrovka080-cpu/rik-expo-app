import fs from "node:fs";
import path from "node:path";

import {
  isAiDocumentActionForbidden,
  listAiDocumentForbiddenActionPolicies,
} from "../../src/features/ai/documents/aiDocumentForbiddenActionPolicy";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI documents no signing/no deletion architecture", () => {
  const sourceFiles = [
    "src/features/ai/documents/aiDocumentRouteRegistry.ts",
    "src/features/ai/documents/aiDocumentEvidenceResolver.ts",
    "src/features/ai/documents/aiDocumentKnowledgePolicy.ts",
    "src/features/ai/documents/aiDocumentForbiddenActionPolicy.ts",
    "scripts/e2e/runAiDocumentKnowledgeRouteCloseoutMaestro.ts",
  ];
  const combined = sourceFiles.map(read).join("\n");

  it("keeps final document actions forbidden by policy", () => {
    const policies = listAiDocumentForbiddenActionPolicies();

    expect(isAiDocumentActionForbidden("documents.main.forbidden")).toBe(true);
    expect(isAiDocumentActionForbidden("sign_final_document")).toBe(true);
    expect(isAiDocumentActionForbidden("send_final_document_directly")).toBe(true);
    expect(isAiDocumentActionForbidden("delete_document")).toBe(true);
    expect(policies.every((policy) => policy.directFinalSubmitAllowed === false)).toBe(true);
    expect(policies.every((policy) => policy.signingAllowed === false)).toBe(true);
    expect(policies.every((policy) => policy.deletionAllowed === false)).toBe(true);
  });

  it("does not add direct DB, provider, service role, UI rewrite, or final execution paths", () => {
    expect(combined).toContain("uiRouteRegistered: false");
    expect(combined).toContain("routeRegisteredOrAliased: true");
    expect(combined).toContain("canonicalAliasId: \"agent.documents.knowledge\"");
    expect(combined).not.toMatch(/\bcreateClient\(|\bsupabase\.from\(|\bclient\.from\(|\.insert\(|\.update\(|\.delete\(|\brpc\(/i);
    expect(combined).not.toMatch(/auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(combined).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(combined).not.toMatch(/signingAllowed:\s*true|finalSubmitAllowed:\s*true|deletionAllowed:\s*true/i);
    expect(combined).not.toMatch(/directFinalSubmitAllowed:\s*true|rawDocumentExportAllowed:\s*true/i);
    expect(combined).not.toMatch(/(^|[^A-Za-z])fakeDocuments:\s*true|fakeDocumentsAllowed:\s*true|fake_green_claimed:\s*true/i);
    expect(combined).not.toMatch(/final_execution:\s*[1-9]|mutation_count:\s*[1-9]|db_writes:\s*[1-9]/i);
  });
});
