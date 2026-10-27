import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanUnboundedAiQueries(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanUnboundedAiQueries",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\.select\s*\(\s*["'`]\*["'`]\s*\)|\bselect\s+\*\s+from\b/i,
    reason: "AI app-data retrieval must be bounded, scoped, and explicit; unbounded select * is forbidden.",
  });
}
