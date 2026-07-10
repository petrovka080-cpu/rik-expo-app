import { createAiEstimateRuntime } from "../../../estimate/runtime/createAiEstimateRuntime";
import type { AiEstimatePlugin } from "./AiEstimatePluginContract";

export function createAiEstimatePlugin(): AiEstimatePlugin {
  const runtime = createAiEstimateRuntime();
  return {
    pluginId: "ai_estimate",
    run(input) {
      if (input.runInput.mode === "safe_read") {
        return {
          flowId: input.runInput.flowId,
          status: "completed",
          userVisibleAnswerRu: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0441\u043c\u0435\u0442\u044b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0447\u0435\u0440\u0435\u0437 AI runtime.",
        };
      }
      if (input.runInput.mode === "forbidden") {
        return {
          flowId: input.runInput.flowId,
          status: "forbidden",
          userVisibleAnswerRu: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 AI \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u043e \u043f\u043e \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0435.",
        };
      }
      const draft = runtime.createDraft({
        estimateDraftId: input.runInput.contextRef?.estimateId ?? input.runInput.flowId,
        rawInput: input.runInput.userText || input.runInput.intent,
        createdAt: "2026-07-10T00:00:00.000Z",
      });
      const passport = runtime.buildParameterPassport({ revision: draft.revision });
      return {
        flowId: input.runInput.flowId,
        status: input.runInput.mode === "approval_required" ? "needs_approval" : "completed",
        userVisibleAnswerRu: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0441\u043c\u0435\u0442\u044b \u0441\u043e\u0431\u0440\u0430\u043d \u0447\u0435\u0440\u0435\u0437 \u0435\u0434\u0438\u043d\u044b\u0439 AI runtime.",
        draft: {
          revisionId: draft.revision.revisionId,
          estimateDraftId: draft.revision.estimateDraftId,
          rowCount: draft.revision.boq.rows.length,
          parameterCardsCount: passport.cards.length,
        },
      };
    },
  };
}
