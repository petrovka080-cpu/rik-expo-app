import { createAiContextBuilder } from "../context/AiContextBuilder";
import type { AiContextBuilder } from "../context/AiContextContract";
import { recordAiRunLedger } from "../ledger/AiRunLedger";
import { createInMemoryAiRunLedgerStore, type AiRunLedgerStore } from "../ledger/AiRunLedgerStore";
import { createAiEstimatePlugin } from "../plugins/estimate/AiEstimatePlugin";
import type { AiEstimatePlugin } from "../plugins/estimate/AiEstimatePluginContract";
import type { AiModelProviderPort } from "../providers/AiModelProviderPort";
import { InMemoryAiModelProvider } from "../providers/InMemoryAiModelProvider";
import { buildAiApprovalRequest } from "../tools/AiApprovalPolicy";
import { createAiToolRegistry, defaultToolNameForAiRun, type AiToolRegistry } from "../tools/AiToolRegistry";
import {
  AI_RUN_MODES,
  AI_RUNTIME_KERNEL_VERSION,
  AI_PLATFORM_SURFACES,
  type AiRunInput,
  type AiRunResult,
  type AiRunValidationResult,
  type AiRuntimeKernel,
} from "./AiRuntimeKernelContract";

export type CreateAiRuntimeKernelOptions = {
  provider?: AiModelProviderPort;
  contextBuilder?: AiContextBuilder;
  toolRegistry?: AiToolRegistry;
  ledgerStore?: AiRunLedgerStore;
  estimatePlugin?: AiEstimatePlugin;
};

const DEFAULT_MODEL_KEY = "platform-default";

function invalidResult(input: AiRunInput, reason: string): AiRunResult {
  return {
    flowId: input.flowId,
    status: "failed",
    userVisibleAnswerRu: reason,
  };
}

export function createAiRuntimeKernel(options: CreateAiRuntimeKernelOptions = {}): AiRuntimeKernel {
  const provider = options.provider ?? new InMemoryAiModelProvider();
  const contextBuilder = options.contextBuilder ?? createAiContextBuilder();
  const toolRegistry = options.toolRegistry ?? createAiToolRegistry();
  const ledgerStore = options.ledgerStore ?? createInMemoryAiRunLedgerStore();
  const estimatePlugin = options.estimatePlugin ?? createAiEstimatePlugin();

  async function validate(input: AiRunInput): Promise<AiRunValidationResult> {
    const blockingReasons = [
      input.flowId ? "" : "flow_id_missing",
      AI_PLATFORM_SURFACES.includes(input.surface) ? "" : "surface_invalid",
      AI_RUN_MODES.includes(input.mode) ? "" : "mode_invalid",
      input.sourceSha ? "" : "source_sha_missing",
      input.runtimeVersion ? "" : "runtime_version_missing",
    ].filter(Boolean);
    return {
      ok: blockingReasons.length === 0,
      blockingReasons,
      modeAllowed: AI_RUN_MODES.includes(input.mode),
      redactionRequired: true,
      ledgerRequired: true,
      approvalPolicyRequired: input.mode === "approval_required",
    };
  }

  return {
    async validate(input) {
      return validate(input);
    },
    async run(input) {
      const validation = await validate(input);
      if (!validation.ok) return invalidResult(input, validation.blockingReasons.join(", "));
      const context = contextBuilder.build(input);
      const toolName = defaultToolNameForAiRun(input);
      const toolPlan = toolRegistry.plan(input, toolName);
      let providerResult = null;
      let result: AiRunResult;

      if (!context.redactionPassed) {
        result = invalidResult(input, "AI context redaction failed");
      } else if (input.mode === "forbidden" || !toolPlan.allowed) {
        result = {
          flowId: input.flowId,
          status: "forbidden",
          userVisibleAnswerRu: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 AI \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u043e \u043f\u043e \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0435.",
          toolPlan,
        };
      } else if (input.surface === "estimate") {
        result = {
          ...estimatePlugin.run({ runInput: input }),
          toolPlan,
        };
      } else if (input.mode === "approval_required") {
        result = {
          flowId: input.flowId,
          status: "needs_approval",
          userVisibleAnswerRu: "\u041d\u0443\u0436\u043d\u043e \u044f\u0432\u043d\u043e\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435.",
          toolPlan,
          requiredApproval: buildAiApprovalRequest(input),
        };
      } else {
        providerResult = await provider.complete({
          modelKey: DEFAULT_MODEL_KEY,
          messages: context.messages,
          responseContract: {
            contractId: `ai-platform-${input.surface}`,
            version: AI_RUNTIME_KERNEL_VERSION,
            responseFormat: "text",
          },
          budget: {
            maxInputChars: context.budget.maxInputChars,
            maxOutputTokens: 512,
            timeoutMs: 30_000,
          },
          redaction: {
            policyId: "ai-platform-context-redaction",
            version: "v1",
            redactionRequired: true,
          },
          sourceSha: input.sourceSha,
        });
        result = {
          flowId: input.flowId,
          status: providerResult.safety.blocked ? "failed" : "completed",
          userVisibleAnswerRu: providerResult.text || "\u0413\u043e\u0442\u043e\u0432\u043e.",
          toolPlan,
        };
      }

      const ledgerRecord = recordAiRunLedger({
        store: ledgerStore,
        input,
        result,
        providerResult,
        toolPlan,
        redactionPassed: context.redactionPassed,
        budgetUsed: {
          inputChars: context.budget.inputChars,
          maxInputChars: context.budget.maxInputChars,
          outputTokens: providerResult?.usage.outputTokens,
        },
      });

      return {
        ...result,
        diagnostics: {
          providerKey: providerResult?.providerKey,
          modelKey: providerResult?.modelKey,
          contextSources: context.sourceMapping.map((source: { sourceId: string }) => source.sourceId),
          redactionPassed: context.redactionPassed,
          budgetUsed: {
            inputChars: context.budget.inputChars,
            maxInputChars: context.budget.maxInputChars,
          },
          ledgerRecordId: ledgerRecord.aiRunId,
        },
      };
    },
  };
}
