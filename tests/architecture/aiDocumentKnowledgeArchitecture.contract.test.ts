import fs from "node:fs";
import path from "node:path";

describe("AI document knowledge architecture", () => {
  const projectRoot = process.cwd();

  function read(relativePath: string): string {
    return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  }

  it("keeps document knowledge backend-first and read-only", () => {
    const routes = read("src/features/ai/agent/agentDocumentKnowledgeRoutes.ts");
    const contracts = read("src/features/ai/agent/agentDocumentKnowledgeContracts.ts");
    const searchPreview = read("src/features/ai/documents/aiDocumentSearchPreview.ts");

    expect(contracts).toContain("directSupabaseFromUi: false");
    expect(contracts).toContain("externalLiveFetchEnabled: false");
    expect(contracts).toContain("fakeDocuments: false");
    expect(routes).toContain("mutationCount: 0");
    expect(routes).toContain("rawContentReturned: false");
    expect(searchPreview).not.toMatch(/fetch\(|supabase\.from|service_role|auth\.admin|listUsers|seed/i);
  });
});
