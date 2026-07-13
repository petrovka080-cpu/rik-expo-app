import type { AiRunInput, AiPlatformRole } from "../kernel/AiRuntimeKernelContract";
import type { AiPlatformToolDefinition, AiPlatformToolPlan } from "./AiToolContract";
import { planAiPlatformTool } from "./AiToolExecutionPolicy";

const ALL_ROLES: readonly AiPlatformRole[] = ["consumer", "foreman", "director", "buyer", "office", "admin"];

export const AI_PLATFORM_TOOL_REGISTRY: readonly AiPlatformToolDefinition[] = [
  {
    name: "read_estimate_history",
    kind: "safe_read",
    requiredRoles: ALL_ROLES,
    description: "Read scoped estimate history through the estimate runtime.",
  },
  {
    name: "create_estimate_draft",
    kind: "draft_only",
    requiredRoles: ALL_ROLES,
    description: "Create an AI estimate draft through the estimate plugin.",
  },
  {
    name: "generate_document_draft",
    kind: "draft_only",
    requiredRoles: ["foreman", "director", "buyer", "office", "admin"],
    description: "Generate a document or report draft without final submission.",
  },
  {
    name: "submit_approval_gate",
    kind: "approval_required",
    requiredRoles: ALL_ROLES,
    description: "Create an approval request, without executing the final mutation.",
  },
  {
    name: "mutate_production_db",
    kind: "forbidden",
    requiredRoles: [],
    description: "Direct production mutation is forbidden for AI.",
  },
];

export type AiToolRegistry = {
  get(name: string): AiPlatformToolDefinition | null;
  plan(input: AiRunInput, toolName: string): AiPlatformToolPlan;
  list(): AiPlatformToolDefinition[];
};

export function createAiToolRegistry(
  tools: readonly AiPlatformToolDefinition[] = AI_PLATFORM_TOOL_REGISTRY,
): AiToolRegistry {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  return {
    get(name) {
      return byName.get(name) ?? null;
    },
    plan(input, toolName) {
      return planAiPlatformTool(input, byName.get(toolName) ?? null);
    },
    list() {
      return [...byName.values()];
    },
  };
}

export function defaultToolNameForAiRun(input: AiRunInput): string {
  if (input.mode === "forbidden") return "mutate_production_db";
  if (input.mode === "approval_required") return "submit_approval_gate";
  if (input.surface === "estimate") return input.mode === "safe_read" ? "read_estimate_history" : "create_estimate_draft";
  if (input.surface === "document" || input.surface === "report") return "generate_document_draft";
  return input.mode === "draft_only" ? "generate_document_draft" : "read_estimate_history";
}
