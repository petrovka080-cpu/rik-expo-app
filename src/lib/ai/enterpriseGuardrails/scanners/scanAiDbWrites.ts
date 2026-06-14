import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

function isCryptoDigestUpdate(line: string): boolean {
  return /\b(?:crypto\.)?createHash\s*\([^)]*\)\s*\.update\s*\(/.test(line);
}

export function scanAiDbWrites(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiDbWrites",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(\s*["'`](create|update|delete|approve|reject|close|sign|publish|issue|write|submit)/i,
    reason: "AI answer path must not perform DB writes or mutation RPC calls.",
    ignore: (finding, file) => {
      const line = file.text.split(/\r?\n/)[finding.line - 1] ?? "";
      const matchedMethod = finding.matchedText.toLowerCase().replace(/^\./, "").replace(/\($/, "");
      return matchedMethod === "update" && isCryptoDigestUpdate(line);
    },
  });
}
