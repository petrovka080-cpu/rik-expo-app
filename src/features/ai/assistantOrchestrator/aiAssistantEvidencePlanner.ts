import type { AiUserRole } from "../policy/aiRolePolicy";
import type { AiScreenActionEvidenceSource } from "../screenActions/aiScreenActionTypes";
import type {
  AiScreenLocalAssistantEvidencePlan,
  AiScreenLocalAssistantEvidenceRef,
} from "./aiScreenLocalAssistantTypes";

const MAX_EVIDENCE_REFS = 20;

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function evidenceSourceFor(
  source: AiScreenActionEvidenceSource | "runtime_policy" | "screen_action_map",
): AiScreenLocalAssistantEvidenceRef["source"] {
  if (source === "approval_policy") return "approval_policy";
  if (source === "role_policy") return "role_policy";
  if (source === "tool_contract") return "tool_contract";
  if (source === "runtime_policy") return "runtime_policy";
  if (source === "screen_action_map") return "screen_action_map";
  return "screen_state";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildAiAssistantEvidencePlan(params: {
  screenId: string;
  role: AiUserRole;
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  runtimeKnown: boolean;
  actionMapKnown: boolean;
  inputEvidenceRefs?: readonly string[];
}): AiScreenLocalAssistantEvidencePlan {
  const sourceTokens = unique([
    "role_policy",
    "screen_action_map",
    params.runtimeKnown ? "runtime_policy" : "",
    ...params.evidenceSources,
  ]);
  const inputRefs = unique(params.inputEvidenceRefs ?? []).slice(0, MAX_EVIDENCE_REFS);
  const generatedRefs = sourceTokens.map((source) => {
    const normalizedSource = normalizeToken(source);
    return {
      id: `ai.screen_assistant.${normalizeToken(params.screenId)}.${normalizedSource}`,
      source: evidenceSourceFor(
        source as AiScreenActionEvidenceSource | "runtime_policy" | "screen_action_map",
      ),
      screenId: params.screenId,
      label: `${params.screenId}:${normalizedSource}`,
      redacted: true,
      rawContentReturned: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    } satisfies AiScreenLocalAssistantEvidenceRef;
  });
  const passthroughRefs = inputRefs.map(
    (ref) =>
      ({
        id: `ai.screen_assistant.external_ref.${normalizeToken(ref).slice(0, 80)}`,
        source: "screen_state",
        screenId: params.screenId,
        label: "caller_supplied_redacted_evidence_ref",
        redacted: true,
        rawContentReturned: false,
        rawDbRowsExposed: false,
        rawPromptExposed: false,
      }) satisfies AiScreenLocalAssistantEvidenceRef,
  );

  return {
    screenId: params.screenId,
    role: params.role,
    evidenceRefs: [...generatedRefs, ...passthroughRefs].slice(0, MAX_EVIDENCE_REFS),
    citationsRequired: false,
    internalFirst: true,
    rawContentReturned: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    evidenceBacked: true,
  };
}

export function evidenceRefIds(plan: AiScreenLocalAssistantEvidencePlan): string[] {
  return plan.evidenceRefs.map((ref) => ref.id);
}
