import { createAiEstimateRuntime } from "../../../estimate/runtime/createAiEstimateRuntime";
import { buildAiEstimateMissingInputQuestions } from "../../../estimate/buildAiEstimateMissingInputQuestions";
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
      const missingQuestions = buildAiEstimateMissingInputQuestions({
        revision: draft.revision,
        maxQuestions: 5,
      });
      const userText = input.runInput.userText ?? "";
      const preliminaryInputNeedsClarification = /цены?\s+нет|предварительн/i.test(userText);
      const missingPrompt = missingQuestions && missingQuestions.questions.length > 0
        ? ` Нужно уточнить исходные данные для профессиональной сметы. ${missingQuestions.questions.map((question) => question.questionRu).join(" ")}`
        : preliminaryInputNeedsClarification
          ? " Нужно уточнить исходные данные для профессиональной сметы."
        : "";
      return {
        flowId: input.runInput.flowId,
        status: input.runInput.mode === "approval_required" ? "needs_approval" : "completed",
        userVisibleAnswerRu: `Черновик сметы собран через единый AI runtime.${missingPrompt}`,
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
