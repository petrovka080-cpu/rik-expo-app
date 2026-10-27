import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanAiDangerousMutations(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiDangerousMutations",
    files: readAiEnterpriseSourceFiles({ rootDir }),
    pattern: /\b(approveRequest|rejectRequest|createPurchaseOrder|createPayment|issueStock|writeOffStock|closeWork|signAct|publishProduct|executeApprovedAction|submitFinal)\s*\(/i,
    reason: "AI cannot execute final payment/order/stock/work/document/security mutations.",
  });
}
