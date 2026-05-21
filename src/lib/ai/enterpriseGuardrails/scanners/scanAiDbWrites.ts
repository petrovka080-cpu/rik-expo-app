import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanAiDbWrites(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiDbWrites",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(\s*["'`](create|update|delete|approve|reject|close|sign|publish|issue|write|submit)/i,
    reason: "AI answer path must not perform DB writes or mutation RPC calls.",
  });
}
