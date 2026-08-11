import type { ConsumerRepairAiDraft } from "../consumerRequests/consumerRequestTypes";
import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_ID,
  type ProfessionalBoqAssumptions,
  type ProfessionalBoqRiskPolicy,
} from "./professionalBoqContract";
import { buildProfessionalAssumptionEngineResult } from "./professionalAssumptionEngine";
import { buildProfessionalBoqRiskPolicy } from "./professionalBoqRiskPolicy";
import { safeJsonParseValue } from "../format";

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|round_to|normFactor|baseQuantity|region\s+[A-Z]{2}|price date|confidence\s+\d|PARTIAL_PRICE_MISSING)\b/i;

const REFUSAL_PUBLIC_TEXT_RE =
  /(?:не\s+могу\s+рассчитать|невозможно\s+посчитать|только\s+после\s+черт|без\s+черт[её]ж|drawings_required_stop)/i;

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function buildProfessionalBoqAssumptions(input: {
  prompt: string;
  rowCount: number;
  hasAnySourceBackedPrice: boolean;
  riskPolicy: ProfessionalBoqRiskPolicy;
  allowPromptDefaults?: boolean;
}): ProfessionalBoqAssumptions {
  return buildProfessionalAssumptionEngineResult(input);
}

function hasSourceBackedPrice(item: ConsumerRepairAiDraft["items"][number]): boolean {
  return item.unitPrice != null && (
    Boolean(item.priceTrace) ||
    item.priceStatus === "CATALOG_PRICE_VERIFIED" ||
    item.priceStatus === "PRICEBOOK_VERIFIED" ||
    item.priceStatus === "REFERENCE_PRICE_ESTIMATE"
  );
}

function publicSummaryFallback(draft: ConsumerRepairAiDraft): string {
  return `${draft.titleRu || "Смета"}. Предварительная BOQ-смета готова к проверке и редактированию.`;
}

function appendUniquePublicSummaryParts(parts: string[]): string[] {
  const result: string[] = [];
  for (const part of parts.map((line) => line.trim()).filter(Boolean)) {
    if (result.some((existing) => existing === part || existing.includes(part))) continue;
    result.push(part);
  }
  return result;
}

export function sanitizeProfessionalBoqPublicSummary(
  summary: string | null | undefined,
  fallback: string,
): string {
  const lines = String(summary ?? "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !RAW_PUBLIC_TEXT_RE.test(line))
    .filter((line) => !/^Точный справочник материалов:/i.test(line));
  const compact = lines.join(" ").replace(/\s+/g, " ").trim();
  return compact || fallback;
}

export function applyProfessionalBoqRuntimeContract(
  draft: ConsumerRepairAiDraft,
  input: { prompt: string },
): ConsumerRepairAiDraft {
  if (draft.items.length === 0) return draft;
  const riskPolicy = buildProfessionalBoqRiskPolicy({
    prompt: input.prompt,
    repairType: draft.repairType,
    selectedWorkKey: draft.selectedWork?.selectedWorkKey,
  });
  const assumptions = buildProfessionalBoqAssumptions({
    prompt: input.prompt,
    rowCount: draft.items.length,
    hasAnySourceBackedPrice: draft.items.some(hasSourceBackedPrice),
    riskPolicy,
    // Exact V4 domain compilers already carry every quantity-affecting input in
    // the immutable parameter snapshot. Prompt heuristics must not add a second
    // layer of silent domain defaults after compilation.
    allowPromptDefaults: !draft.items.every((item) =>
      item.sourceParameters?.roadworksWaveA === true ||
      item.sourceParameters?.asphaltRelatedV4 === true
    ),
  });
  const summary = sanitizeProfessionalBoqPublicSummary(draft.summaryRu, publicSummaryFallback(draft));
  const publicSummaryParts = appendUniquePublicSummaryParts([
    summary,
    riskPolicy.summaryNoteRu,
    assumptions.drawingsPolicyRu,
    assumptions.pricePolicyRu,
  ]).filter((line) => !REFUSAL_PUBLIC_TEXT_RE.test(line) || line.includes("предварительный BOQ"));

  return {
    ...draft,
    summaryRu: publicSummaryParts.join(" "),
    dangerousDiyBlocked: false,
    safetyMessageRu: riskPolicy.requiresSpecialist ? riskPolicy.summaryNoteRu : draft.safetyMessageRu,
    missingData: unique([...draft.missingData, ...assumptions.missingInputsRu]),
    items: draft.items.map((item, index) => ({
      ...item,
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        professionalBoqRuntimeContract: PROFESSIONAL_BOQ_RUNTIME_CONTRACT_ID,
        professionalBoqRuntimeRowIndex: index,
        professionalBoqRiskLevel: riskPolicy.riskLevel,
        professionalBoqRiskCodes: riskPolicy.riskCodes,
        professionalBoqRiskNotesRu: riskPolicy.publicNotesRu,
        professionalBoqAssumptionsRu: assumptions.assumptionsRu,
        professionalBoqDefaultAssumptionsRu: assumptions.defaultAssumptionsRu ?? [],
        professionalBoqMissingInputsRu: assumptions.missingInputsRu,
        professionalBoqPricePolicyRu: assumptions.pricePolicyRu,
        professionalBoqDrawingsPolicyRu: assumptions.drawingsPolicyRu,
        professionalBoqDrawingsRequiredForDraft: false,
        professionalBoqDrawingsNotRequiredForPreliminaryBoq: true,
        professionalBoqDefaultsApplied: assumptions.professionalDefaultsApplied === true,
        professionalBoqFinalContractStatusBlockedUntilReview: true,
      },
    })),
  };
}

export function professionalBoqRiskRowsFromSourceParameters(
  sourceParameters: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  const level = typeof sourceParameters?.professionalBoqRiskLevel === "string"
    ? sourceParameters.professionalBoqRiskLevel
    : "";
  const notes = Array.isArray(sourceParameters?.professionalBoqRiskNotesRu)
    ? sourceParameters.professionalBoqRiskNotesRu.filter((item): item is string => typeof item === "string")
    : [];
  const assumptions = Array.isArray(sourceParameters?.professionalBoqAssumptionsRu)
    ? sourceParameters.professionalBoqAssumptionsRu.filter((item): item is string => typeof item === "string")
    : [];
  const missingInputs = Array.isArray(sourceParameters?.professionalBoqMissingInputsRu)
    ? sourceParameters.professionalBoqMissingInputsRu.filter((item): item is string => typeof item === "string")
    : [];
  const drawingsPolicy = typeof sourceParameters?.professionalBoqDrawingsPolicyRu === "string"
    ? sourceParameters.professionalBoqDrawingsPolicyRu
    : "";
  const pricePolicy = typeof sourceParameters?.professionalBoqPricePolicyRu === "string"
    ? sourceParameters.professionalBoqPricePolicyRu
    : "";
  return unique([
    level && notes.length > 0 ? JSON.stringify({
      label: "Риск/допуск",
      value: notes[0],
    }) : "",
    assumptions.length > 0 ? JSON.stringify({
      label: "Допущения",
      value: assumptions.slice(0, 4).join("; "),
    }) : "",
    missingInputs.length > 0 ? JSON.stringify({
      label: "Недостающие вводные",
      value: missingInputs.slice(0, 6).join("; "),
    }) : "",
    drawingsPolicy ? JSON.stringify({
      label: "Чертежи",
      value: drawingsPolicy,
    }) : "",
    pricePolicy ? JSON.stringify({
      label: "Цены",
      value: pricePolicy,
    }) : "",
  ]).map((item) => safeJsonParseValue<{ label: string; value: string }>(item, {
    label: "",
    value: "",
  }));
}
