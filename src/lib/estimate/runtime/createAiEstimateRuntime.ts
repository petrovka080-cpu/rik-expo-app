import { buildAiEstimateParameterCards } from "../buildAiEstimateParameterCards";
import { applyAiEstimateMissingInputAnswer } from "../applyAiEstimateMissingInputAnswer";
import {
  applyAiEstimateParameterBatchOverride,
  applyAiEstimateParameterOverride,
} from "../applyAiEstimateParameterOverrides";
import { buildAiEstimateNormativeWorkParameterPassport } from "../aiEstimateNormativeWorkParameterPassport";
import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import { buildAiEstimateFormulaDag } from "../formula/buildAiEstimateFormulaDag";
import { buildAiEstimateParameterGraph } from "../graph/buildAiEstimateParameterGraph";
import { buildNormativeParameterCompletenessModel } from "../buildNormativeParameterCompletenessModel";
import { parseUserParamPatch } from "../parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../recalculateEstimateDraftRevision";
import {
  createDefaultAiEstimateRuntimePorts,
  type AiEstimateRuntimePorts,
} from "../application/createAiEstimateRuntimePorts";
import type { AiEstimateRuntime } from "./AiEstimateRuntime";

export type CreateAiEstimateRuntimeOptions = {
  ports?: Partial<AiEstimateRuntimePorts>;
};

function rowCounts(revision: ReturnType<typeof createEstimateDraftRevision>) {
  return {
    rowCount: revision.boq.rows.length,
    materialRowsCount: revision.boq.rows.filter((row) => row.rowType === "material").length,
    workRowsCount: revision.boq.rows.filter((row) => row.rowType === "work" || row.rowType === "labor").length,
  };
}

export function createAiEstimateRuntime(options: CreateAiEstimateRuntimeOptions = {}): AiEstimateRuntime {
  const defaults = createDefaultAiEstimateRuntimePorts();
  const ports: AiEstimateRuntimePorts = {
    ...defaults,
    ...options.ports,
  };
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
          paramOverrides: input.selectedRoadScope
            ? {
              selectedRoadScope: {
                value: input.selectedRoadScope,
                source: "user_input",
                sourceText: "Explicit road scope selection",
                lastChangedAt: input.createdAt ?? new Date().toISOString(),
              },
            }
            : undefined,
          createdAt: input.createdAt,
          source: "initial_prompt",
          revisionIndex: 1,
        }),
      };
    },
    classifyWork(input) {
      const entry = input.selectedTemplateId
        ? ports.catalog.buildIndex().byTemplateId.get(input.selectedTemplateId) ?? null
        : null;
      return {
        classification: ports.catalog.classifyWork(entry ?? input.rawInput),
      };
    },
    buildParameterPassport(input) {
      const passport = buildAiEstimateNormativeWorkParameterPassport(input.revision.selectedTemplateId);
      const cards = buildAiEstimateParameterCards({ revision: input.revision, includeMissing: true });
      const completenessModel = buildNormativeParameterCompletenessModel(input.revision);
      return {
        revisionId: input.revision.revisionId,
        templateId: input.revision.selectedTemplateId,
        passport,
        cards,
        missingInputs: input.revision.missingInputs,
        completeness: {
          presentParameterCount: Object.keys(input.revision.params).length,
          missingParameterCount: completenessModel?.missingRequirements.length ?? input.revision.missingInputs.length,
          requiredForQuantityMissingCount: completenessModel?.missingRequirements
            .filter((item) => item.requirement.role === "required_for_quantity").length ?? 0,
          requiredForProfessionalAccuracyMissingCount: completenessModel?.missingRequirements
            .filter((item) => item.requirement.role === "required_for_professional_accuracy").length ?? 0,
        },
      };
    },
    applyParameterOverride(input) {
      return applyAiEstimateParameterOverride(input);
    },
    applyParameterBatchOverride(input) {
      return applyAiEstimateParameterBatchOverride(input);
    },
    answerMissingInput(input) {
      return applyAiEstimateMissingInputAnswer(input);
    },
    approveRevision(input) {
      const approvedAt = input.approvedAt ?? new Date().toISOString();
      const counts = rowCounts(input.revision);
      ports.ledger.upsertDraft({
        estimateId: input.revision.estimateDraftId,
        ownerUserId: input.ownerUserId,
        orgId: input.orgId ?? null,
        kind: input.kind ?? "ai_estimate",
        sourceRoute: input.sourceRoute ?? "/request",
        title: input.title ?? input.revision.matchedFamily ?? input.revision.selectedTemplateId,
        prompt: input.revision.rawInput,
        selectedTemplateId: input.revision.selectedTemplateId,
        family: input.revision.matchedFamily,
        createdAt: approvedAt,
        updatedAt: approvedAt,
        status: "draft",
        sourceDraftId: input.revision.estimateDraftId,
        currentRevisionId: input.revision.revisionId,
        sourceSnapshotId: input.snapshotId ?? input.revision.artifacts.snapshotId ?? `snapshot:${input.revision.revisionId}`,
        ...counts,
        artifacts: {
          snapshotId: input.snapshotId ?? input.revision.artifacts.snapshotId,
          pdfArtifactId: input.pdfArtifactId ?? input.revision.artifacts.pdfArtifactId,
          buyerHandoffId: input.buyerHandoffId ?? input.revision.artifacts.buyerHandoffId,
          artifactsValidForRevisionId: input.revision.revisionId,
        },
        actorUserId: input.actorUserId ?? input.ownerUserId,
        sourceLayer: "runtime",
        idempotencyKey: input.idempotencyKey ?? `runtime_upsert:${input.revision.estimateDraftId}:${input.revision.revisionId}`,
      });
      const approved = ports.ledger.approveRevision({
        estimateId: input.revision.estimateDraftId,
        revisionId: input.revision.revisionId,
        approvedAt,
        actorUserId: input.actorUserId ?? input.ownerUserId,
        sourceLayer: "runtime",
        idempotencyKey: input.idempotencyKey ?? `runtime_approve:${input.revision.estimateDraftId}:${input.revision.revisionId}`,
      });
      const history = ports.ledger.listApprovedHistory({ ownerUserId: input.ownerUserId, limit: 1 });
      return {
        approved: true,
        estimateId: approved.record.estimateId,
        revisionId: approved.record.currentRevisionId,
        historyRecord: history.records[0] ?? null,
      };
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
      return ports.pdf.buildPdfSnapshot({ revision: input.revision });
    },
    buildBuyerPackage(input) {
      return ports.buyerPackage.buildBuyerPackage({
        revision: input.revision,
        snapshot: input.snapshot,
      });
    },
    loadApprovedHistory(input) {
      const page = ports.ledger.listApprovedHistory({
        ownerUserId: input.ownerUserId,
        limit: input.limit,
        cursorCreatedAt: input.cursorCreatedAt,
      });
      return page;
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
