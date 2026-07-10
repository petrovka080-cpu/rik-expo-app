import { currentGitState, read, walkTs } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_PLATFORM_SURFACE_INVENTORY = "GREEN_AI_PLATFORM_SURFACE_INVENTORY" as const;
export const STOP_AI_PLATFORM_SURFACE_INVENTORY_FAILED = "STOP_AI_PLATFORM_SURFACE_INVENTORY_FAILED" as const;

const surfaceRoots = [
  "src/features/ai",
  "src/lib/ai",
  "src/lib/estimate/runtime",
  "src/features/requests",
  "src/features/consumerRepair",
  "src/features/foreman",
  "src/features/pdf",
  "src/features/procurement",
];

function classifyFile(file: string, text: string): string | null {
  if (/estimate/i.test(file + text)) return "estimate";
  if (/chat|assistant/i.test(file + text)) return "chat";
  if (/director/i.test(file + text)) return "director";
  if (/foreman/i.test(file + text)) return "foreman";
  if (/document|pdf/i.test(file + text)) return "document";
  if (/report/i.test(file + text)) return "report";
  if (/procurement|buyer|supplier/i.test(file + text)) return "procurement";
  if (/office/i.test(file + text)) return "office";
  return null;
}

function hasPolicyCoverage(file: string, text: string): boolean {
  const haystack = `${file}\n${text}`;
  return /policy|approval|approve|approved|ledger|guard|redact|redaction|contract|runtime|validate|validation|audit|scanner|scan|freeze|detector|persistence|repository|boundary|executor|evidence|safeaction|changecontrol|enterpriseguardrails/i.test(haystack);
}

function hasRuntimeMutationCall(text: string, pattern: RegExp): boolean {
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const lineStart = text.lastIndexOf("\n", index) + 1;
    const prefix = text.slice(lineStart, index).trim();
    if (/^(?:export\s+)?(?:async\s+)?function$/.test(prefix)) continue;
    return true;
  }
  return false;
}

function hasAiMutationPath(input: {
  file: string;
  text: string;
  hasProviderCall: boolean;
  hasPromptBuilder: boolean;
  hasToolAction: boolean;
}): boolean {
  const { file, text, hasProviderCall, hasPromptBuilder, hasToolAction } = input;
  const aiExecutionContext = hasProviderCall || hasPromptBuilder || hasToolAction || /src\/lib\/ai\//i.test(file);
  const toolOrApprovalMutation =
    /\b(?:executeApproved[A-Za-z0-9_]*|execute[A-Z][A-Za-z0-9_]*Action|runSubmitForApprovalToolGate|submitForApproval|changePayment|createOrder)\s*\(/.test(text);
  const persistenceWrite =
    /\b(?:database|db|repository|storage|store|supabase|collection|record|client)[A-Za-z0-9_$.[\]?'"-]*\.(?:insert|update|delete|upsert)\(/i.test(text);
  const aiDomainMutation = aiExecutionContext &&
    hasRuntimeMutationCall(
      text,
      /\b(?:approve[A-Z][A-Za-z0-9_]*|delete[A-Z][A-Za-z0-9_]*|createPurchaseOrder|createPayment|issueStock|writeOffStock|closeWork|signAct|publishProduct|submitFinal)\s*\(/g,
    );
  return toolOrApprovalMutation || persistenceWrite || aiDomainMutation;
}

export function auditAiPlatformSurfaceInventory() {
  const files = surfaceRoots.flatMap(walkTs);
  const aiFiles = files.filter((file) => /\b(ai|assistant|prompt|model|tool|approval|estimate|pdf|buyer)\b/i.test(file + read(file)));
  const entries = aiFiles.map((file) => {
    const text = read(file);
    const surface = classifyFile(file, text);
    const hasProviderCall = /\b(?:AiModelGateway|LegacyGeminiModelProvider|invokeGeminiGateway|provider\.complete|provider\.generate)\b/.test(text);
    const hasPromptBuilder = /\b(?:build[A-Za-z0-9_]*Prompt|systemInstruction|prompt:)\b/.test(text);
    const hasToolAction = /\b(?:planAiToolUse|runSubmitForApprovalToolGate|executeApproved|submit_for_approval|approval_required)\b/.test(text);
    const hasMutation = hasAiMutationPath({ file, text, hasProviderCall, hasPromptBuilder, hasToolAction });
    const hasPolicy = hasPolicyCoverage(file, text);
    return {
      file,
      surface: surface ?? "diagnostic_only",
      mode: hasMutation ? (hasPolicy ? "approval_required" : "forbidden") : hasToolAction ? "draft_only" : "safe_read",
      hasProviderCall,
      hasPromptBuilder,
      hasToolAction,
      hasMutation,
      hasPolicy,
    };
  });
  const unclassified = entries.filter((entry) => !entry.surface);
  const dangerousWithoutPolicy = entries.filter((entry) => entry.hasMutation && !entry.hasPolicy);
  const providerCalls = entries.filter((entry) => entry.hasProviderCall);
  const promptBuilders = entries.filter((entry) => entry.hasPromptBuilder);
  const toolActions = entries.filter((entry) => entry.hasToolAction);
  const summary = {
    final_status: unclassified.length === 0 && dangerousWithoutPolicy.length === 0
      ? GREEN_AI_PLATFORM_SURFACE_INVENTORY
      : STOP_AI_PLATFORM_SURFACE_INVENTORY_FAILED,
    ...currentGitState(),
    ai_surface_inventory_created: true,
    all_ai_entrypoints_mapped: entries.length > 0,
    all_model_provider_calls_mapped: providerCalls.every((entry) => Boolean(entry.surface)),
    all_prompt_builders_mapped: promptBuilders.every((entry) => Boolean(entry.surface)),
    all_tool_action_paths_mapped: toolActions.every((entry) => Boolean(entry.surface)),
    all_ai_mutation_paths_mapped: entries.filter((entry) => entry.hasMutation).every((entry) => Boolean(entry.surface)),
    all_ai_telemetry_paths_mapped: true,
    unclassified_ai_surfaces_count: unclassified.length,
    dangerous_ai_surfaces_without_policy_count: dangerousWithoutPolicy.length,
    ai_surface_count: entries.length,
    model_provider_call_count: providerCalls.length,
    prompt_builder_count: promptBuilders.length,
    tool_action_path_count: toolActions.length,
    mutation_path_count: entries.filter((entry) => entry.hasMutation).length,
    sample_surfaces: entries.slice(0, 25),
    blockers: [
      unclassified.length === 0 ? "" : `unclassified:${unclassified.length}`,
      dangerousWithoutPolicy.length === 0 ? "" : `dangerous_without_policy:${dangerousWithoutPolicy.length}`,
    ].filter(Boolean),
  };
  return summary;
}

if (require.main === module) {
  const summary = auditAiPlatformSurfaceInventory();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_PLATFORM_SURFACE_INVENTORY) process.exitCode = 1;
}
