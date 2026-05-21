import { scanAiApprovalExecutionPatchPatterns } from "../../src/lib/ai/approvalExecutionBoundary";

export function getAiApprovalArchitectureScan() {
  return scanAiApprovalExecutionPatchPatterns({ rootDir: process.cwd() });
}
