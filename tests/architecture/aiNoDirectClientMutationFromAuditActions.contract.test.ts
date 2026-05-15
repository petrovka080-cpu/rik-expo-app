import fs from "node:fs";
import path from "node:path";

import {
  scanAiAuditActionsForDirectClientAccess,
  verifyAiBffRouteCoverage,
} from "../../src/features/ai/bffCoverage/aiBffRouteCoverageVerifier";

const files = [
  "src/features/ai/bffCoverage/aiBffRouteCoverageTypes.ts",
  "src/features/ai/bffCoverage/aiBffRouteCoverageRegistry.ts",
  "src/features/ai/bffCoverage/aiBffRouteCoverageVerifier.ts",
  "src/features/ai/bffCoverage/aiBffMissingRoutePlanner.ts",
  "scripts/ai/verifyAiBffRouteCoverage.ts",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI audited actions no direct client mutation architecture", () => {
  it("scanner finds no direct Supabase/Auth Admin access in audited action metadata", () => {
    expect(scanAiAuditActionsForDirectClientAccess()).toEqual([]);
    expect(verifyAiBffRouteCoverage()).toMatchObject({
      finalStatus: "GREEN_AI_BFF_ROUTE_COVERAGE_MAP_READY",
      directClientAccessFindings: 0,
      unmountedExistingRoutes: 0,
    });
  });

  it("keeps BFF coverage closeout files source-only and mutation-free", () => {
    for (const file of files) {
      const source = read(file);

      expect(source).not.toMatch(/@supabase\/supabase-js|createClient\(|\bsupabase\s*\.\s*(?:from|rpc)\s*\(/i);
      expect(source).not.toMatch(/\bauth\s*\.\s*admin\s*\.\s*\w+\s*\(|\blistUsers\s*\(/i);
      expect(source).not.toMatch(/\bSUPABASE_SERVICE_ROLE_KEY\s*=/);
      expect(source).not.toMatch(/\.(?:from|rpc|insert|update|upsert|delete)\s*\(/);
      expect(source).not.toMatch(/\b(openai|gpt-|Gemini|modelProvider|LegacyGeminiModelProvider)\b/);
      expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
      expect(source).not.toMatch(/testID\s*=/);
    }
  });
});
