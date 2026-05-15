import fs from "node:fs";
import path from "node:path";

import { verifyAiRolePermissionActionBoundary } from "../../src/features/ai/security/aiActionPermissionBoundary";

const projectRoot = process.cwd();
const securitySourceFiles = [
  "src/features/ai/security/aiRolePermissionActionMatrix.ts",
  "src/features/ai/security/aiActionPermissionBoundary.ts",
  "src/features/ai/security/aiRoleEscalationPolicy.ts",
  "src/features/ai/security/aiBffAuthorizationContract.ts",
] as const;

function readSecuritySource(): string {
  return securitySourceFiles
    .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8"))
    .join("\n");
}

describe("AI no role escalation architecture", () => {
  it("keeps the security boundary as a pure policy layer with no DB, network, provider, or direct execution path", () => {
    const source = readSecuritySource();

    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\.from\s*\(|\.rpc\s*\(/i);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|EventSource|WebSocket/i);
    expect(source).not.toMatch(/\binsert\s*\(|\bupdate\s*\(|\bupsert\s*\(|\bdelete\s*\(/i);
    expect(source).not.toMatch(/\brawProviderPayload\b|\brawDbRows\b|\brawPrompt\b/);
    expect(source).toContain("directExecuteAllowed: false");
  });

  it("reports no role escalation findings in the production verifier", () => {
    expect(verifyAiRolePermissionActionBoundary()).toMatchObject({
      finalStatus: "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY",
      roleEscalationFindings: [],
    });
  });
});
