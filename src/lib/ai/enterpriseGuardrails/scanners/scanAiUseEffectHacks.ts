import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanAiUseEffectHacks(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiUseEffectHacks",
    files: readAiEnterpriseSourceFiles({
      rootDir,
      includeRoots: [
        "src/lib/ai/appContextGraph",
        "src/lib/ai/universalRoleQa",
        "src/lib/ai/liveScreenCopilot",
        "src/lib/ai/enterpriseGuardrails",
      ],
    }),
    pattern: /\buseEffect\s*\(/,
    reason: "AI fetching, source planning, and answer composition cannot be hidden in useEffect.",
  });
}
