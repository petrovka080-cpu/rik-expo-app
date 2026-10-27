import fs from "node:fs";
import path from "node:path";

import type { AiContractRuntimeFileScanFinding, AiContractRuntimePatchScanResult } from "./aiContractRuntimeTypes";

export type AiNoSymptomPatchPolicy = {
  forbiddenPatterns: (
    | "question_id_answer_hardcode"
    | "screen_id_answer_hardcode"
    | "button_id_answer_hardcode"
    | "local_component_ai_if_else"
    | "side_effect_fetch_patch"
    | "new_ai_hook_patch"
    | "fallback_instead_of_root_cause"
    | "fake_empty_state"
    | "generic_answer_masking_failure"
    | "manual_source_ref_in_ui_without_gateway"
  )[];
  allowedFixLocations: (
    | "normalizer"
    | "classifier"
    | "source_planner"
    | "domain_gateway"
    | "domain_provider"
    | "cross_domain_link_resolver"
    | "answer_composer"
    | "semantic_guard"
    | "ui_presenter"
    | "proof_runner"
  )[];
  requireRootCauseArtifact: true;
  requireRegressionQuestion: true;
  requireInvariantUpdateIfNewClassOfBug: true;
};

export const AI_NO_SYMPTOM_PATCH_POLICY: AiNoSymptomPatchPolicy = {
  forbiddenPatterns: [
    "question_id_answer_hardcode",
    "screen_id_answer_hardcode",
    "button_id_answer_hardcode",
    "local_component_ai_if_else",
    "side_effect_fetch_patch",
    "new_ai_hook_patch",
    "fallback_instead_of_root_cause",
    "fake_empty_state",
    "generic_answer_masking_failure",
    "manual_source_ref_in_ui_without_gateway",
  ],
  allowedFixLocations: [
    "normalizer",
    "classifier",
    "source_planner",
    "domain_gateway",
    "domain_provider",
    "cross_domain_link_resolver",
    "answer_composer",
    "semantic_guard",
    "ui_presenter",
    "proof_runner",
  ],
  requireRootCauseArtifact: true,
  requireRegressionQuestion: true,
  requireInvariantUpdateIfNewClassOfBug: true,
};

type ScanSource = {
  file: string;
  text: string;
};

const DEFAULT_SCAN_ROOTS = [
  "src/lib/ai/contractRuntime",
  "scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts",
  "scripts/e2e/runAiContractRuntimeInvariantWebProof.ts",
  "scripts/e2e/runAiContractRuntimeInvariantMaestroProof.ts",
];

const PROOF_AND_TEST_ALLOWLIST = [
  "tests/",
  "artifacts/",
  "src/lib/ai/evaluation/goldenBusinessDataset/",
  "src/lib/ai/contractRuntime/aiContractRuntimeTypes.ts",
  "src/lib/ai/contractRuntime/aiContractRuntimeMatrix.ts",
  "src/lib/ai/contractRuntime/aiRootCauseClassifier.ts",
  "src/lib/ai/contractRuntime/aiNoSymptomPatchPolicy.ts",
  "scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts",
];

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

function isAllowedScanFile(file: string): boolean {
  return PROOF_AND_TEST_ALLOWLIST.some((prefix) => normalize(file).startsWith(prefix));
}

function countPattern(
  sources: readonly ScanSource[],
  pattern: RegExp,
  reasonRu: string,
): AiContractRuntimeFileScanFinding[] {
  const findings: AiContractRuntimeFileScanFinding[] = [];
  for (const source of sources) {
    if (isAllowedScanFile(source.file)) continue;
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

export function scanAiContractRuntimePatchPatterns(params: {
  rootDir?: string;
  includeRoots?: readonly string[];
  inlineSources?: readonly ScanSource[];
} = {}): AiContractRuntimePatchScanResult {
  const rootDir = params.rootDir ?? process.cwd();
  const sources = params.inlineSources
    ? [...params.inlineSources]
    : readScanSources(rootDir, params.includeRoots ?? DEFAULT_SCAN_ROOTS);

  const questionFindings = countPattern(
    sources,
    /\bquestionId\b\s*(?:===|==|:)\s*["'`]|normalizedQuestionRu\.(?:includes|startsWith)\s*\(/,
    "Production answer path cannot branch on question id or literal question text.",
  );
  const screenFindings = countPattern(
    sources,
    /\bscreenId\b\s*(?:===|==)\s*["'`].*(?:answer|reply|summary)|screen_id_answer_hardcode/i,
    "Screen-specific answer hardcodes hide root causes.",
  );
  const buttonFindings = countPattern(
    sources,
    /\bbuttonId\b\s*(?:===|==)\s*["'`].*(?:answer|reply|summary)|button_id_answer_hardcode/i,
    "Button-specific answer hardcodes hide root causes.",
  );
  const symptomFindings = countPattern(
    sources,
    /local_component_ai_if_else|manual_source_ref_in_ui_without_gateway|generic_answer_masking_failure|fake_empty_state/i,
    "Symptom patches must be replaced by a fix in the owning AI layer.",
  );
  const fallbackFindings = countPattern(
    sources,
    /fallback_instead_of_root_cause|fallback_hide_failure|hideInvariantFailure/i,
    "Fallbacks cannot mask invariant failures.",
  );
  const dbFindings = countPattern(
    sources,
    /\.(?:from|select|insert|update|upsert|delete|rpc)\s*\(/,
    "AI UI/screen path cannot call database or providers directly.",
  );

  const findings = [
    ...questionFindings,
    ...screenFindings,
    ...buttonFindings,
    ...symptomFindings,
    ...fallbackFindings,
    ...dbFindings,
  ];

  return {
    questionIdHardcodesFound: questionFindings.length,
    screenIdAnswerHardcodesFound: screenFindings.length,
    buttonIdAnswerHardcodesFound: buttonFindings.length,
    symptomPatchesFound: symptomFindings.length,
    fallbackHideFailureFound: fallbackFindings.length,
    directDbFromScreensFound: dbFindings.length,
    findings,
  };
}
