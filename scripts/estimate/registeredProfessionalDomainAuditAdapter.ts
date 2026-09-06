import type { ConsumerRepairAiDraft } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { applyUserParamPatch } from "../../src/lib/estimate/applyUserParamPatch";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionSource,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { buildElectricalFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/electricalComplete/productionBinding";
import { ELECTRICAL_COMPLETE_DOMAIN_ID } from "../../src/lib/estimate/v4/domains/electricalComplete/inventory";
import { buildHvacFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/heatingVentilationComplete/productionBinding";
import { HVAC_COMPLETE_DOMAIN_ID } from "../../src/lib/estimate/v4/domains/heatingVentilationComplete/inventory";
import { buildInteriorFinishesFromInlineInputV1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding";
import { INTERIOR_FINISHES_COMPLETE_DOMAIN_ID } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";
import {
  resolveRegisteredProfessionalEstimateSelectionV1,
  type RegisteredProfessionalEstimateSelectionV1,
} from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";

type RegisteredAuditRevisionInput = {
  templateId: string;
  rawInput: string;
  estimateDraftId: string;
  createdAt: string;
  revisionIndex?: number;
  previousRevisionId?: string | null;
  source?: EstimateDraftRevisionSource;
  paramOverrides?: EstimateDraftRevision["params"];
  assumptionOverrides?: EstimateDraftRevision["assumptions"];
  changedParamKey?: string | null;
};

function compileRegisteredAuditDraft(
  selection: RegisteredProfessionalEstimateSelectionV1,
  input: Pick<RegisteredAuditRevisionInput, "rawInput" | "paramOverrides">,
): ConsumerRepairAiDraft {
  const buildInput = {
    rawInput: input.rawInput,
    selectedWorkKey: selection.work_key,
    selectedTemplateId: selection.template_id,
    selectedTemplateName: selection.title_ru,
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: input.paramOverrides,
  };
  const draft = selection.domain_id === INTERIOR_FINISHES_COMPLETE_DOMAIN_ID
    ? buildInteriorFinishesFromInlineInputV1(buildInput).production?.draft
    : selection.domain_id === ELECTRICAL_COMPLETE_DOMAIN_ID
      ? buildElectricalFromInlineInputV1(buildInput).production?.draft
      : selection.domain_id === HVAC_COMPLETE_DOMAIN_ID
        ? buildHvacFromInlineInputV1(buildInput).production?.draft
        : null;
  if (!draft) {
    throw new Error(`REGISTERED_PROFESSIONAL_AUDIT_BACKEND_COMPILE_FAILED:${selection.domain_id}:${selection.catalog_id}`);
  }
  return draft as ConsumerRepairAiDraft;
}

/**
 * Audit-only adapter for the canonical domain compiler used by backend proofs.
 * Production synchronous ingress remains fail-closed with
 * CANONICAL_BACKEND_REQUIRED and never imports these bindings.
 */
export function createRegisteredProfessionalDomainAuditRevision(
  input: RegisteredAuditRevisionInput,
): EstimateDraftRevision {
  const selection = resolveRegisteredProfessionalEstimateSelectionV1(input.templateId);
  if (!selection) throw new Error(`REGISTERED_PROFESSIONAL_AUDIT_SELECTION_MISSING:${input.templateId}`);
  const prebuiltExactDraft = compileRegisteredAuditDraft(selection, input);
  return createEstimateDraftRevision({
    estimateDraftId: input.estimateDraftId,
    previousRevisionId: input.previousRevisionId,
    rawInput: input.rawInput,
    selectedWorkKey: selection.work_key,
    selectedTemplateId: selection.template_id,
    selectedTemplateName: selection.title_ru,
    currency: "KGS",
    countryCode: "KG",
    source: input.source,
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
    paramOverrides: input.paramOverrides,
    assumptionOverrides: input.assumptionOverrides,
    changedParamKey: input.changedParamKey,
    prebuiltExactDraft,
  });
}

export function recalculateRegisteredProfessionalDomainAuditRevision(input: {
  previous: EstimateDraftRevision;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  createdAt: string;
  revisionIndex: number;
}): { revision: EstimateDraftRevision; diff: EstimateDraftRevisionDiff } {
  const patch = parseUserParamPatch({
    revision: input.previous,
    operation: input.operation,
    paramKey: input.paramKey,
    rawValue: input.rawValue,
  });
  const patched = applyUserParamPatch(input.previous, patch, input.createdAt);
  const source: EstimateDraftRevisionSource = input.operation === "add_param"
    ? "param_add"
    : input.operation === "replace_assumption"
      ? "assumption_override"
      : "param_edit";
  const revision = createRegisteredProfessionalDomainAuditRevision({
    templateId:
      input.previous.resolvedIdentity?.requestedCatalogWorkId ?? input.previous.selectedTemplateId,
    estimateDraftId: input.previous.estimateDraftId,
    previousRevisionId: input.previous.revisionId,
    rawInput: input.previous.rawInput,
    source,
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
    paramOverrides: patched.params,
    assumptionOverrides: patched.assumptions,
    changedParamKey: input.paramKey,
  });
  return {
    revision,
    diff: compareEstimateDraftRevisions(input.previous, revision),
  };
}
