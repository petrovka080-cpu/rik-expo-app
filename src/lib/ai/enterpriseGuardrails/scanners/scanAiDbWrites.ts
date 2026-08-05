import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

function isCryptoDigestUpdate(line: string): boolean {
  return /\b(?:crypto\.)?createHash\s*\([^)]*\)\s*\.update\s*\(/.test(line);
}

function isInMemoryCollectionDelete(line: string, source: string): boolean {
  const receiver = line.match(/\b([A-Za-z_$][\w$]*)\.delete\s*\(/)?.[1];
  if (!receiver) return false;
  const escapedReceiver = receiver.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`\\b(?:const|let|var)\\s+${escapedReceiver}\\s*=\\s*new\\s+(?:Map|Set)\\b`).test(source) ||
    new RegExp(`\\b${escapedReceiver}\\s*:\\s*(?:Readonly)?(?:Map|Set)\\s*(?:<|\\b)`).test(source)
  );
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
      if (matchedMethod === "update" && isCryptoDigestUpdate(line)) return true;
      if (matchedMethod === "delete" && isInMemoryCollectionDelete(line, file.text)) return true;
      return false;
    },
  });
}
