import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanAiHooks(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiHooks",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\buse(State|Effect|Memo|Callback|Reducer|Ref|FocusEffect|Ai[A-Za-z0-9_]*)\s*\(/,
    reason: "Enterprise AI layers must remain pure services/adapters and cannot introduce React hooks.",
    ignore: (finding) =>
      finding.file.endsWith("aiLiveScreenProofInventory.ts") &&
      finding.matchedText === "useEffect",
  });
}
