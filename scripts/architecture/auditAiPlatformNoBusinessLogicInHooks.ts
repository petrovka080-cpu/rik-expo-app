import { currentGitState, read, walkTs } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS =
  "GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS" as const;
export const STOP_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS_FAILED =
  "STOP_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS_FAILED" as const;

const uiRoots = [
  "src/features/ai",
  "src/features/requests",
  "src/features/consumerRepair",
  "src/features/foreman",
  "src/screens",
];

const hookPattern = /\b(?:useEffect|useMemo|useCallback|function use[A-Z]|const use[A-Z])/;
const promptBuilderPattern = /\b(?:new AiModelGateway|LegacyGeminiModelProvider|provider\.generate|provider\.complete|invokeGeminiGateway|buildAssistantSystemPrompt\(|build[A-Za-z0-9_]*Prompt\()/;
const toolExecutionPattern = /\b(?:executeApproved|runSubmitForApprovalToolGate|run[A-Za-z0-9_]*ToolSafeRead|createOrder|changePayment|mutate_production_db)\b/;
const approvalMutationPattern = /\b(?:approvedByUserId|executeApprovedAiAction|approveRevision|approvalGranted\s*:\s*true)\b/;

function isUiFile(file: string): boolean {
  return /\.(tsx)$/.test(file) || /\/hooks\/|\\hooks\\|use[A-Z]/.test(file);
}

export function auditAiPlatformNoBusinessLogicInHooks() {
  const files = uiRoots.flatMap(walkTs).filter(isUiFile);
  const hookFiles = files.filter((file) => hookPattern.test(read(file)));
  const promptBuilding = hookFiles.filter((file) => promptBuilderPattern.test(read(file)));
  const providerCalls = hookFiles.filter((file) => /\b(?:new AiModelGateway|LegacyGeminiModelProvider|provider\.generate|invokeGeminiGateway)\b/.test(read(file)));
  const toolExecution = hookFiles.filter((file) => toolExecutionPattern.test(read(file)));
  const approvalMutation = hookFiles.filter((file) => approvalMutationPattern.test(read(file)));
  const count = promptBuilding.length + providerCalls.length + toolExecution.length + approvalMutation.length;
  return {
    final_status: count === 0
      ? GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS
      : STOP_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS_FAILED,
    ...currentGitState(),
    ai_ui_hooks_audit_created: true,
    ai_business_logic_in_hooks_count: count,
    prompt_building_in_components_count: promptBuilding.length,
    provider_calls_in_components_count: providerCalls.length,
    tool_execution_in_components_count: toolExecution.length,
    approval_mutation_in_components_count: approvalMutation.length,
    prompt_building_files: promptBuilding,
    provider_call_files: providerCalls,
    tool_execution_files: toolExecution,
    approval_mutation_files: approvalMutation,
    blockers: count === 0 ? [] : ["ai_business_logic_in_hooks_detected"],
  };
}

if (require.main === module) {
  const summary = auditAiPlatformNoBusinessLogicInHooks();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS) process.exitCode = 1;
}
