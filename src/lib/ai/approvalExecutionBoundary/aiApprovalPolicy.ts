import fs from "node:fs";
import path from "node:path";

import type { AiApprovalPatchScanFinding, AiApprovalPatchScanResult } from "./aiApprovalTypes";

export type AiApprovalExecutionPolicy = {
  answerPipelineReadOnly: true;
  aiDraftIsNotExecution: true;
  humanApprovalIsNotExecution: true;
  executionBoundaryRequired: true;
  existingActionLedgerRequired: true;
  existingApprovedBusinessServiceRequired: true;
  requesterSelfApprovalAllowed: false;
  autoApprovalAllowed: false;
  directDbMutationAllowed: false;
  screenLocalExecutionAllowed: false;
};

export const AI_APPROVAL_EXECUTION_POLICY: AiApprovalExecutionPolicy = {
  answerPipelineReadOnly: true,
  aiDraftIsNotExecution: true,
  humanApprovalIsNotExecution: true,
  executionBoundaryRequired: true,
  existingActionLedgerRequired: true,
  existingApprovedBusinessServiceRequired: true,
  requesterSelfApprovalAllowed: false,
  autoApprovalAllowed: false,
  directDbMutationAllowed: false,
  screenLocalExecutionAllowed: false,
};

const SCAN_ROOTS = [
  "src/lib/ai/approvalExecutionBoundary",
  "scripts/ai/runAiHumanApprovalLedgerExecutionBoundaryProof.ts",
  "scripts/e2e/runAiHumanApprovalLedgerExecutionBoundaryWebProof.ts",
  "scripts/e2e/runAiHumanApprovalLedgerExecutionBoundaryMaestroProof.ts",
] as const;

const FILES_ALLOWED_TO_DESCRIBE_POLICY = new Set([
  "src/lib/ai/approvalExecutionBoundary/aiApprovalTypes.ts",
  "src/lib/ai/approvalExecutionBoundary/aiApprovalPolicy.ts",
  "src/lib/ai/approvalExecutionBoundary/proofs/approvalExecutionProofMatrix.ts",
]);

function walkFiles(target: string): string[] {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith(".ts") || target.endsWith(".tsx") ? [target] : [];
  return fs.readdirSync(target).flatMap((entry) => walkFiles(path.join(target, entry)));
}

function addFinding(
  findings: AiApprovalPatchScanFinding[],
  file: string,
  pattern: string,
  reasonRu: string,
): void {
  findings.push({ file: file.replace(/\\/g, "/"), pattern, reasonRu });
}

export function scanAiApprovalExecutionPatchPatterns(params: {
  rootDir?: string;
} = {}): AiApprovalPatchScanResult {
  const rootDir = params.rootDir ?? process.cwd();
  const findings: AiApprovalPatchScanFinding[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    for (const filePath of walkFiles(path.join(rootDir, scanRoot))) {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
      if (FILES_ALLOWED_TO_DESCRIBE_POLICY.has(relativePath) || relativePath.includes("/proofs/")) continue;
      const text = fs.readFileSync(filePath, "utf8");
      if (/\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(text)) {
        addFinding(findings, relativePath, "hook_call", "Approval execution boundary must not add hooks.");
      }
      if (/\buseEffect\s*\(/.test(text)) {
        addFinding(findings, relativePath, "useEffect", "Approval execution boundary must not add useEffect hacks.");
      }
      if (/new\s+(Approval|Action).*Framework|createSecondApproval|secondApprovalFramework/i.test(text)) {
        addFinding(findings, relativePath, "second_framework", "Do not create a second approval/action framework.");
      }
      if (/screenLocal|localApprovalHandler|localExecutionHandler|buttonId\s*===|questionId\s*===/i.test(text)) {
        addFinding(findings, relativePath, "screen_local_or_hardcode", "Approval/execution logic must not live in screens or button/question hardcodes.");
      }
      if (/supabase|\.from\s*\(|directDbMutation:\s*true|\.(?:insert|delete|upsert)\s*\(|\.update\s*\(\s*\{/i.test(text)) {
        addFinding(findings, relativePath, "direct_db_mutation", "Execution boundary must not call DB directly.");
      }
      if (/executeWithoutApproval|bypassApproval|canBypass:\s*true|autoApprove|autoApproval:\s*true/i.test(text)) {
        addFinding(findings, relativePath, "approval_bypass", "Approval ledger and human decision cannot be bypassed.");
      }
      if (/requesterCanApproveOwnRequest|canRequesterApproveOwnRequest:\s*true|selfApproval:\s*true|allowSelfApproval/i.test(text)) {
        addFinding(findings, relativePath, "requester_self_approval", "Requester self approval is forbidden.");
      }
    }
  }

  const count = (pattern: string) => findings.filter((finding) => finding.pattern === pattern).length;
  return {
    hooksFound: count("hook_call"),
    useEffectHacksFound: count("useEffect"),
    secondApprovalFrameworkFound: count("second_framework"),
    secondActionFrameworkFound: count("second_framework"),
    screenLocalApprovalLogicFound: count("screen_local_or_hardcode"),
    screenLocalExecutionLogicFound: count("screen_local_or_hardcode"),
    directDbMutationFound: count("direct_db_mutation"),
    executionBoundaryBypassFound: count("approval_bypass"),
    approvalBypassFound: count("approval_bypass"),
    autoApprovalFound: count("approval_bypass"),
    requesterSelfApprovalFound: count("requester_self_approval"),
    hardcodedApprovalFound: count("screen_local_or_hardcode"),
    findings,
  };
}
