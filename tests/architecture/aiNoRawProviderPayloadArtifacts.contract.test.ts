import fs from "node:fs";
import path from "node:path";

import { scanAiArtifactSourceForUnsafePayloads } from "../../src/features/ai/observability/aiArtifactScrubPolicy";
import { writeAiObservabilitySafetyArtifacts } from "../../scripts/ai/verifyAiObservabilitySafety";

const observabilitySourceFiles = [
  "src/features/ai/observability/aiTraceEnvelope.ts",
  "src/features/ai/observability/aiBudgetPolicy.ts",
  "src/features/ai/observability/aiProviderPayloadRedaction.ts",
  "src/features/ai/observability/aiArtifactScrubPolicy.ts",
  "scripts/ai/verifyAiObservabilitySafety.ts",
] as const;

const newWaveArtifacts = [
  "artifacts/S_AI_OBSERVABILITY_01_TRACE_BUDGET_REDACTION_inventory.json",
  "artifacts/S_AI_OBSERVABILITY_01_TRACE_BUDGET_REDACTION_matrix.json",
  "artifacts/S_AI_OBSERVABILITY_01_TRACE_BUDGET_REDACTION_proof.md",
] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI raw provider payload artifact boundary", () => {
  it("keeps observability sources provider-free and writes scrub-safe artifacts", () => {
    const matrix = writeAiObservabilitySafetyArtifacts();

    expect(matrix.final_status).toBe("GREEN_AI_TRACE_BUDGET_REDACTION_HARDENING_READY");
    for (const relativePath of observabilitySourceFiles) {
      const source = readProjectFile(relativePath);
      const importLines = source.split(/\r?\n/).filter((line) => /^\s*import\b|\brequire\(/.test(line));

      expect(importLines.join("\n")).not.toMatch(
        /features\/ai\/model|AiModelGateway|LegacyGeminiModelProvider|openai|gemini|@supabase\/supabase-js|\bauth\.admin\b|\blistUsers\b/i,
      );
    }

    for (const relativePath of newWaveArtifacts) {
      const source = readProjectFile(relativePath);
      const findings = scanAiArtifactSourceForUnsafePayloads({
        artifactPath: relativePath,
        source,
      });

      if (relativePath.endsWith(".json")) {
        expect(() => JSON.parse(source)).not.toThrow();
      }
      expect(findings).toEqual([]);
    }
  });
});
