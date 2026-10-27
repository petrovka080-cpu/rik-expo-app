import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanApprovalBypass(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanApprovalBypass",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\b(autoApproval\s*:\s*true|finalSubmit\s*:\s*true|approvalBypass\s*:\s*true|bypassApproval\s*\()/i,
    reason: "AI may prepare drafts and approval routes, but cannot bypass approval or auto-submit.",
  });
}
