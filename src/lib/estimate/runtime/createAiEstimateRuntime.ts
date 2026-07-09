import { createBuyerHandoffFromDraftRevision } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../../features/pdf/renderPdfFromDraftRevision";
import { applyAiEstimateParameterOverride } from "../applyAiEstimateParameterOverrides";
import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import { buildAiEstimateFormulaDag } from "../formula/buildAiEstimateFormulaDag";
import { buildAiEstimateParameterGraph } from "../graph/buildAiEstimateParameterGraph";
import { parseUserParamPatch } from "../parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../recalculateEstimateDraftRevision";
import type { AiEstimateRuntime } from "./AiEstimateRuntime";

export function createAiEstimateRuntime(): AiEstimateRuntime {
  return {
    createDraft(input) {
      return {
        revision: createEstimateDraftRevision({
          estimateDraftId: input.estimateDraftId,
          rawInput: input.rawInput,
          selectedTemplateId: input.selectedTemplateId,
          selectedTemplateName: input.selectedTemplateName,
          selectedWorkKey: input.selectedWorkKey,
          city: input.city,
          currency: input.currency,
          countryCode: input.countryCode,
          createdAt: input.createdAt,
          source: "initial_prompt",
          revisionIndex: 1,
        }),
      };
    },
    applyParameterOverride(input) {
      return applyAiEstimateParameterOverride(input);
    },
    rebuildFromRevision(input) {
      const firstParam = Object.entries(input.revision.params)
        .find(([, param]) => typeof param.value === "number");
      const patch = parseUserParamPatch({
        revision: input.revision,
        operation: firstParam ? "update_param" : "add_param",
        paramKey: firstParam?.[0] ?? "q",
        rawValue: String(firstParam ? firstParam[1].value : "1"),
      });
      const result = recalculateEstimateDraftRevision(input.revision, patch, {
        createdAt: input.createdAt,
        revisionIndex: input.revisionIndex,
      });
      return {
        ...result,
        pdfBuyerPackageStale: true,
      };
    },
    buildPdfSnapshot(input) {
      return renderPdfFromDraftRevision({ revision: input.revision });
    },
    buildBuyerPackage(input) {
      const result = createBuyerHandoffFromDraftRevision({
        revision: input.revision,
        snapshot: input.snapshot,
      });
      return {
        revision: result.revision,
        snapshot: result.snapshot,
        buyerPackage: result.buyerHandoff,
      };
    },
    validate(input) {
      const graph = input.revision ? buildAiEstimateParameterGraph({ revision: input.revision }) : null;
      const dag = input.revision ? buildAiEstimateFormulaDag({ revision: input.revision }) : null;
      const blockingReasons = [
        graph ? "" : "parameter_graph_missing",
        dag ? "" : "formula_dag_missing",
      ].filter(Boolean);
      return {
        ok: blockingReasons.length === 0,
        runtimeFacadeCreated: true,
        parameterGraphCreated: Boolean(graph),
        formulaDagCreated: Boolean(dag),
        blockingReasons,
      };
    },
  };
}
