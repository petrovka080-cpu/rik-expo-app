import fs from "node:fs";
import path from "node:path";

import type { AiSafeActionKind, AiSafeActionPatchScanFinding, AiSafeActionPatchScanResult } from "./aiSafeActionTypes";
import { AI_SAFE_ACTION_REGISTRY } from "./aiSafeActionRegistry";

export type AiSafeActionPolicy = {
  answerPipelineReadOnly: true;
  actionDraftRequiresHumanClick: true;
  finalExecutionRequiresApprovalPolicy: true;
  sourceRefsRequired: true;
  preconditionsRequired: true;
  impactDiffRequired: true;
  humanConfirmationRequired: true;
  forbiddenFinalActions: string[];
};

export const AI_SAFE_ACTION_POLICY: AiSafeActionPolicy = {
  answerPipelineReadOnly: true,
  actionDraftRequiresHumanClick: true,
  finalExecutionRequiresApprovalPolicy: true,
  sourceRefsRequired: true,
  preconditionsRequired: true,
  impactDiffRequired: true,
  humanConfirmationRequired: true,
  forbiddenFinalActions: [
    "create_purchase_order_final",
    "post_payment",
    "issue_stock",
    "receive_stock",
    "close_work",
    "sign_act",
    "publish_marketplace_product",
    "final_link_document",
    "send_final_reminder",
    "auto_approve",
  ],
};

export function isAiSafeActionRegistered(actionKind: AiSafeActionKind): boolean {
  return AI_SAFE_ACTION_REGISTRY.some((entry) => entry.actionKind === actionKind);
}

export function isAiSafeActionFinalMutationBlocked(actionKind: AiSafeActionKind): boolean {
  return isAiSafeActionRegistered(actionKind) && AI_SAFE_ACTION_POLICY.finalExecutionRequiresApprovalPolicy;
}

type ScanSource = {
  file: string;
  text: string;
};

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function readScanSources(rootDir: string, roots: readonly string[]): ScanSource[] {
  const sources: ScanSource[] = [];

  function visit(absolutePath: string): void {
    if (!fs.existsSync(absolutePath)) return;
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        visit(path.join(absolutePath, entry.name));
      }
      return;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(absolutePath)) return;
    sources.push({
      file: normalize(path.relative(rootDir, absolutePath)),
      text: fs.readFileSync(absolutePath, "utf8"),
    });
  }

  for (const root of roots) visit(path.join(rootDir, root));
  return sources;
}

function countPattern(
  sources: readonly ScanSource[],
  pattern: RegExp,
  reasonRu: string,
  allow?: (source: ScanSource) => boolean,
): AiSafeActionPatchScanFinding[] {
  const findings: AiSafeActionPatchScanFinding[] = [];
  for (const source of sources) {
    if (allow?.(source)) continue;
    if (pattern.test(source.text)) {
      findings.push({
        file: source.file,
        pattern: pattern.source,
        reasonRu,
      });
    }
  }
  return findings;
}

const DEFAULT_SAFE_ACTION_SCAN_ROOTS = [
  "src/lib/ai/safeActions",
  "scripts/ai/runAiSafeActionDraftApprovalProof.ts",
  "scripts/e2e/runAiSafeActionDraftApprovalWebProof.ts",
  "scripts/e2e/runAiSafeActionDraftApprovalMaestroProof.ts",
] as const;

export function scanAiSafeActionPatchPatterns(params: {
  rootDir?: string;
  includeRoots?: readonly string[];
  inlineSources?: readonly ScanSource[];
} = {}): AiSafeActionPatchScanResult {
  const rootDir = params.rootDir ?? process.cwd();
  const sources = params.inlineSources
    ? [...params.inlineSources]
    : readScanSources(rootDir, params.includeRoots ?? DEFAULT_SAFE_ACTION_SCAN_ROOTS);
  const allowScannerDefinitionsAndTests = (source: ScanSource) =>
    source.file.includes("/aiSafeActionTypes.ts") ||
    source.file.includes("/aiSafeActionPolicy.ts") ||
    source.file.includes("/proofs/safeActionProofMatrix.ts") ||
    source.file.startsWith("tests/") ||
    source.file.startsWith("artifacts/");

  const hooks = countPattern(
    sources,
    /\buse(State|Effect|Memo|Callback|Reducer|Ref|FocusEffect|Ai[A-Za-z0-9_]*)\s*\(/,
    "Safe action layer cannot add React hooks.",
    allowScannerDefinitionsAndTests,
  );
  const useEffect = countPattern(
    sources,
    /\buseEffect\s*\(/,
    "Safe action layer cannot add useEffect hacks.",
    allowScannerDefinitionsAndTests,
  );
  const secondFramework = countPattern(
    sources,
    /\b(new ActionFramework|createSecondActionFramework|standaloneActionRuntime)\b/i,
    "Safe actions must use the approved orchestrator and existing approval ledger.",
    allowScannerDefinitionsAndTests,
  );
  const screenLocal = countPattern(
    sources,
    /local_button_mutation_handler|screen_local_action_logic|manual_action_in_component/i,
    "Action logic cannot live in screens or local button handlers.",
    allowScannerDefinitionsAndTests,
  );
  const dbWrites = countPattern(
    sources,
    /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(\s*["'`](create|update|delete|approve|reject|close|sign|publish|issue|write|submit)/i,
    "AI safe action draft path cannot write to the database.",
    allowScannerDefinitionsAndTests,
  );
  const finalSubmit = countPattern(
    sources,
    /\b(finalSubmit\s*:\s*true|finalExecutionAllowed\s*:\s*true|final_submit_by_ai)\b/i,
    "AI safe actions cannot final-submit.",
    allowScannerDefinitionsAndTests,
  );
  const approvalBypass = countPattern(
    sources,
    /\b(autoApproval\s*:\s*true|canBypass\s*:\s*true|approvalBypass\s*:\s*true|bypassApproval\s*\()/i,
    "AI safe actions cannot auto-approve or bypass approval.",
    allowScannerDefinitionsAndTests,
  );
  const dangerousMutations = countPattern(
    sources,
    /\b(createPurchaseOrder|postPayment|issueStock|receiveStock|closeWork|signAct|publishProduct|finalLinkDocument|sendFinalReminder)\s*\(/,
    "AI safe actions cannot execute final business mutations.",
    allowScannerDefinitionsAndTests,
  );
  const hardcodedActions = countPattern(
    sources,
    /\b(questionId|buttonId)\b\s*(?:===|==)\s*["'`]|questionRu\.(?:includes|startsWith)\s*\(/,
    "Safe action routing cannot be hardcoded by questionId, buttonId, or literal question text.",
    allowScannerDefinitionsAndTests,
  );

  const findings = [
    ...hooks,
    ...useEffect,
    ...secondFramework,
    ...screenLocal,
    ...dbWrites,
    ...finalSubmit,
    ...approvalBypass,
    ...dangerousMutations,
    ...hardcodedActions,
  ];

  return {
    hooksFound: hooks.length,
    useEffectHacksFound: useEffect.length,
    secondActionFrameworkFound: secondFramework.length,
    screenLocalActionLogicFound: screenLocal.length,
    dbWriteFromAnswerFound: dbWrites.length,
    finalSubmitFound: finalSubmit.length,
    approvalBypassFound: approvalBypass.length,
    dangerousMutationFound: dangerousMutations.length,
    hardcodedActionsFound: hardcodedActions.length,
    findings,
  };
}
