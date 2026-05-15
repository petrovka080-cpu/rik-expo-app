import fs from "node:fs";
import path from "node:path";

import {
  scanAiServicePrivilegeGreenPathFromSources,
  verifyAiRolePermissionActionBoundary,
} from "../../src/features/ai/security/aiActionPermissionBoundary";

const projectRoot = process.cwd();
const securitySourceFiles = [
  "src/features/ai/security/aiRolePermissionActionMatrix.ts",
  "src/features/ai/security/aiActionPermissionBoundary.ts",
  "src/features/ai/security/aiRoleEscalationPolicy.ts",
  "src/features/ai/security/aiBffAuthorizationContract.ts",
  "scripts/ai/verifyAiRolePermissionActionBoundary.ts",
] as const;

function readSources(): readonly { filePath: string; source: string }[] {
  return securitySourceFiles.map((relativePath) => ({
    filePath: relativePath,
    source: fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
  }));
}

describe("AI no service privilege green path architecture", () => {
  it("does not introduce privileged auth discovery or service privilege tokens in security boundary sources", () => {
    const findings = scanAiServicePrivilegeGreenPathFromSources({ sources: readSources() });

    expect(findings).toEqual([]);
    expect(verifyAiRolePermissionActionBoundary({ servicePrivilegeFindings: findings })).toMatchObject({
      finalStatus: "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY",
      servicePrivilegeFindings: [],
    });
  });

  it("blocks if a privileged token appears in the scanned source set", () => {
    const forbiddenToken = ["service", "_role"].join("");
    const findings = scanAiServicePrivilegeGreenPathFromSources({
      sources: [{ filePath: "synthetic.ts", source: `const token = "${forbiddenToken}";` }],
    });

    expect(findings).toEqual([`synthetic.ts:${forbiddenToken}`]);
    expect(verifyAiRolePermissionActionBoundary({ servicePrivilegeFindings: findings })).toMatchObject({
      finalStatus: "BLOCKED_AI_SERVICE_ROLE_GREEN_PATH_RISK",
    });
  });
});
