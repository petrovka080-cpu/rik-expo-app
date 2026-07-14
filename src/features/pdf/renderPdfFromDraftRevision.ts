import { createSnapshotFromDraftRevision, type DraftRevisionSnapshot } from "../estimates/createSnapshotFromDraftRevision";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { getExpandedComplexWorkFamily } from "../../lib/ai/expandedComplexWorks";
import { buildAiEstimateParameterCards } from "../../lib/estimate/buildAiEstimateParameterCards";
import {
  aiEstimateRuAssumptionLabel,
  aiEstimateRuAssumptionReason,
  aiEstimateRuAssumptionValue,
  aiEstimateRequiredForRuLabel,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import { calculateProfessionalCostForDraftRows } from "../../lib/estimate/professionalCostCalculator";
import { renderProfessionalCostSection } from "./renderProfessionalCostSection";
import { renderProfessionalBoqFullMaterialComposition } from "./renderProfessionalBoqFullMaterialComposition";
import { renderMaterialQuantityTraceSection } from "./renderMaterialQuantityTraceSection";
import { renderMaterialWastePackagingSection } from "./renderMaterialWastePackagingSection";

export type DraftRevisionPdfArtifact = {
  pdfArtifactId: string;
  revisionId: string;
  snapshotId: string;
  rowsHash: string;
  rowsEqualLatestRevision: true;
  pdf_revision_binding_enforced: true;
  body: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
}

function estimateLevelRu(revision: EstimateDraftRevision): string {
  if (revision.estimateLevel === "NEEDS_INPUT") return "нужно уточнить исходные данные";
  if (revision.estimateLevel === "CONCEPT_SCOPE") return "концепция состава работ";
  if (revision.estimateLevel === "PRELIMINARY_QUANTITY_BOQ") return "предварительная количественная ведомость";
  if (revision.estimateLevel === "SOURCE_BACKED_PROFESSIONAL_BOQ") return "профессиональная ведомость с подтвержденными источниками";
  if (revision.estimateLevel === "EXPERT_VALIDATED_BOQ") return "проверено профильным экспертом";
  return "предварительная смета";
}

function visibleEstimateTitle(revision: EstimateDraftRevision): string {
  const capacityMw = revision.params.capacity_mw?.value;
  if (revision.matchedFamily === "solar_power_plant" && typeof capacityMw === "number" && Number.isFinite(capacityMw)) {
    return `Солнечная электростанция мощностью ${formatNumber(capacityMw)} МВт`;
  }
  const family = getExpandedComplexWorkFamily(revision.matchedFamily);
  const title = family?.professionalNameRu ?? revision.rawInput.trim();
  return title || "Смета";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function renderHumanPdfCover(revision: EstimateDraftRevision, costCalculated: boolean): string {
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
  const understoodCards = cards.filter((card) => !card.missing && card.source === "user_prompt");
  const confirmedCards = cards.filter((card) => !card.missing);
  const assumptions = revision.assumptions
    .filter((item) => item.visibleToUser && item.key !== "estimate_level" && item.key !== "prices")
    .slice(0, 8)
    .map((item) => [
      aiEstimateRuAssumptionLabel(item.key),
      aiEstimateRuAssumptionValue(item.key, item.value),
      aiEstimateRuAssumptionReason(item.reason, item.replacedByUserInput),
    ].join(": "));
  const sources = unique(revision.boq.rows.map((row) => row.normSourceTitle ?? row.sourceLabel ?? row.sourceId ?? ""));
  const normVersions = unique(revision.boq.rows.map((row) => row.normVersion ?? ""));
  return [
    "Предварительная смета:",
    visibleEstimateTitle(revision),
    `Уровень сметы: ${estimateLevelRu(revision)}`,
    "Предупреждение: расчет предварительный и не заменяет проект, коммерческие предложения и экспертную проверку.",
    costCalculated
      ? "Стоимость рассчитана по доступным подтвержденным ценовым строкам."
      : "Стоимость не рассчитана: требуются коммерческие предложения и подтверждение цен.",
    "Мы поняли из вашего запроса:",
    ...(understoodCards.length > 0
      ? understoodCards.map((card) => `${card.labelRu}: ${card.displayValueRu}`)
      : ["явные параметры в исходном тексте не найдены"]),
    "Подтвержденные параметры:",
    ...(confirmedCards.length > 0
      ? confirmedCards.map((card) => `${card.labelRu}: ${card.displayValueRu}`)
      : ["нет подтвержденных параметров"]),
    "Нужно уточнить:",
    ...(revision.missingInputs.length > 0
      ? revision.missingInputs.map((input) => `${input.label}: ${aiEstimateRequiredForRuLabel(input.requiredFor)}`)
      : ["дополнительные обязательные параметры не требуются"]),
    "Допущения:",
    ...(assumptions.length > 0 ? assumptions : ["допущения не применялись"]),
    "Источники и версии:",
    ...(sources.length > 0 ? sources : ["источники не указаны"]),
    ...(normVersions.length > 0 ? normVersions.map((version) => `Версия норм: ${version}`) : []),
    "Артефактная привязка:",
    "pdf_revision_binding_enforced=true",
  ].join("\n");
}

export function renderPdfFromDraftRevision(input: {
  revision: EstimateDraftRevision;
  snapshot?: DraftRevisionSnapshot;
}): {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
} {
  const snapshotResult = input.snapshot
    ? { snapshot: input.snapshot, revision: input.revision }
    : createSnapshotFromDraftRevision(input.revision);
  if (snapshotResult.snapshot.revisionId !== snapshotResult.revision.revisionId) {
    throw new Error("PDF_DRAFT_REVISION_SNAPSHOT_MISMATCH");
  }
  const cost = calculateProfessionalCostForDraftRows({
    templateId: snapshotResult.revision.selectedTemplateId,
    family: snapshotResult.revision.matchedFamily,
    rows: snapshotResult.snapshot.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other"),
  });
  const pdf: DraftRevisionPdfArtifact = {
    pdfArtifactId: `pdf_${snapshotResult.revision.revisionId}`,
    revisionId: snapshotResult.revision.revisionId,
    snapshotId: snapshotResult.snapshot.snapshotId,
    rowsHash: snapshotResult.snapshot.rowsHash,
    rowsEqualLatestRevision: true,
    pdf_revision_binding_enforced: true,
    body: [
      renderHumanPdfCover(snapshotResult.revision, cost.summary.preliminaryTotalAllowed),
      renderProfessionalBoqFullMaterialComposition({ rows: snapshotResult.snapshot.rows }),
      renderMaterialQuantityTraceSection({
        rows: snapshotResult.snapshot.rows,
        templateId: snapshotResult.revision.selectedTemplateId,
        family: snapshotResult.revision.matchedFamily,
      }),
      renderMaterialWastePackagingSection({
        rows: snapshotResult.snapshot.rows,
        templateId: snapshotResult.revision.selectedTemplateId,
        family: snapshotResult.revision.matchedFamily,
      }),
      renderProfessionalCostSection({ summary: cost.summary, lines: cost.lines }),
    ].join("\n"),
  };
  return {
    snapshot: snapshotResult.snapshot,
    pdf,
    revision: {
      ...snapshotResult.revision,
      artifacts: {
        ...snapshotResult.revision.artifacts,
        snapshotId: snapshotResult.snapshot.snapshotId,
        pdfArtifactId: pdf.pdfArtifactId,
        artifactsValidForRevisionId: snapshotResult.revision.revisionId,
      },
    },
  };
}
