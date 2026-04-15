import type { ContractorInboxRow } from "../../lib/api/contractor.scope.service";
import type { ContractorWorkRow } from "./contractor.loadWorksService";
import { buildCompatibilityWorkRow } from "./contractor.visibilityRecovery";

export type ContractorWorkCardStatus = "approved" | "in_progress" | "done" | "unknown";
export type ContractorWorkCardSourceKind = "canonical" | "compatibility_recovery";
export type ContractorWorkCardQualityState = "current" | "degraded_title";

export type ContractorWorkCardModel = {
  workId: string;
  title: string;
  objectName: string | null;
  systemName: string | null;
  zoneName: string | null;
  contractorName: string | null;
  contractorInn: string | null;
  status: ContractorWorkCardStatus;
  qualityState: ContractorWorkCardQualityState;
  isCanonical: boolean;
  sourceKind: ContractorWorkCardSourceKind;
  progressId: string | null;
};

type ContractorCardModelsResult = {
  cards: ContractorWorkCardModel[];
  workRowByCardId: Map<string, ContractorWorkRow>;
};

const trim = (value: unknown): string => String(value || "").trim();

const firstNonEmpty = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = trim(value);
    if (normalized) return normalized;
  }
  return null;
};

const includesAny = (value: unknown, needles: readonly string[]) => {
  const haystack = trim(value).toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isCompatibilityInboxRow = (row: ContractorInboxRow): boolean =>
  trim(row.diagnostics.sourceVersion).toLowerCase().startsWith("compat:");

export const resolveContractorCardSourceKind = (
  row: ContractorInboxRow,
): ContractorWorkCardSourceKind => (isCompatibilityInboxRow(row) ? "compatibility_recovery" : "canonical");

export function resolveContractorCardStatus(params: {
  inboxRow: ContractorInboxRow;
  matchedLegacyRow?: ContractorWorkRow | null;
}): ContractorWorkCardStatus {
  const { inboxRow, matchedLegacyRow } = params;

  if (matchedLegacyRow) {
    const qtyLeft = toFiniteNumber(matchedLegacyRow.qty_left, Number.POSITIVE_INFINITY);
    const qtyDone = toFiniteNumber(matchedLegacyRow.qty_done, 0);
    if (
      trim(matchedLegacyRow.finished_at) ||
      qtyLeft <= 0 ||
      includesAny(matchedLegacyRow.work_status, ["done", "finish", "complete", "выполн", "заверш"])
    ) {
      return "done";
    }
    if (
      trim(matchedLegacyRow.started_at) ||
      qtyDone > 0 ||
      includesAny(matchedLegacyRow.work_status, ["start", "progress", "work", "в работе", "начат"])
    ) {
      return "in_progress";
    }
  }

  if (trim(inboxRow.origin.sourceSubcontractId) || trim(inboxRow.origin.sourceRequestId)) {
    return "approved";
  }

  return "unknown";
}

export function buildContractorTechnicalWorkRow(params: {
  inboxRow: ContractorInboxRow;
  matchedLegacyRow?: ContractorWorkRow | null;
}): ContractorWorkRow {
  const { inboxRow, matchedLegacyRow } = params;
  const baseRow = matchedLegacyRow ?? buildCompatibilityWorkRow(inboxRow);
  const qtyPlanned = toFiniteNumber(inboxRow.work.quantity, toFiniteNumber(baseRow.qty_planned, 0));
  const qtyDone = toFiniteNumber(baseRow.qty_done, 0);
  const fallbackQtyLeft = Math.max(0, qtyPlanned - qtyDone);

  return {
    ...baseRow,
    progress_id: firstNonEmpty(inboxRow.progressId, baseRow.progress_id, inboxRow.workItemId) ?? inboxRow.workItemId,
    canonical_work_item_id: inboxRow.workItemId,
    canonical_source_kind: inboxRow.origin.sourceKind,
    created_at: firstNonEmpty(inboxRow.origin.directorApprovedAt, baseRow.created_at),
    work_name: inboxRow.work.workName,
    work_code:
      inboxRow.work.workNameSource === "raw_code"
        ? inboxRow.work.workName
        : firstNonEmpty(baseRow.work_code),
    object_name: firstNonEmpty(inboxRow.location.objectName, inboxRow.location.locationDisplay),
    contractor_org: firstNonEmpty(inboxRow.identity.contractorName),
    contractor_inn: firstNonEmpty(inboxRow.identity.contractorInn),
    request_id: firstNonEmpty(inboxRow.origin.sourceRequestId, baseRow.request_id),
    contractor_job_id: firstNonEmpty(inboxRow.origin.sourceSubcontractId, baseRow.contractor_job_id),
    contractor_id: firstNonEmpty(inboxRow.identity.contractorId, baseRow.contractor_id),
    uom_id: firstNonEmpty(inboxRow.work.uom, baseRow.uom_id),
    qty_planned: qtyPlanned,
    qty_done: qtyDone,
    qty_left: toFiniteNumber(baseRow.qty_left, fallbackQtyLeft),
    unit_price:
      inboxRow.work.unitPrice == null
        ? baseRow.unit_price ?? null
        : toFiniteNumber(inboxRow.work.unitPrice, 0),
    work_status: trim(baseRow.work_status) || "ready",
  };
}

export function buildContractorWorkCardModel(params: {
  inboxRow: ContractorInboxRow;
  matchedLegacyRow?: ContractorWorkRow | null;
}): ContractorWorkCardModel {
  const { inboxRow, matchedLegacyRow } = params;
  const sourceKind = resolveContractorCardSourceKind(inboxRow);
  const qualityState: ContractorWorkCardQualityState =
    inboxRow.diagnostics.currentWorkState === "ready_current_degraded_title" ? "degraded_title" : "current";

  return {
    workId: inboxRow.workItemId,
    title: inboxRow.work.workName,
    objectName: firstNonEmpty(inboxRow.location.objectName, inboxRow.location.locationDisplay),
    systemName: firstNonEmpty(inboxRow.location.systemName),
    zoneName: firstNonEmpty(inboxRow.location.zoneName),
    contractorName: firstNonEmpty(inboxRow.identity.contractorName),
    contractorInn: firstNonEmpty(inboxRow.identity.contractorInn),
    status: resolveContractorCardStatus({
      inboxRow,
      matchedLegacyRow,
    }),
    qualityState,
    isCanonical: sourceKind === "canonical",
    sourceKind,
    progressId: firstNonEmpty(inboxRow.progressId),
  };
}

export function buildContractorCardModels(params: {
  inboxRows: ContractorInboxRow[];
  rows: ContractorWorkRow[];
}): ContractorCardModelsResult {
  const { inboxRows, rows } = params;
  const legacyRowByProgressId = new Map<string, ContractorWorkRow>();
  for (const row of rows) {
    const progressId = trim(row.progress_id);
    if (!progressId || legacyRowByProgressId.has(progressId)) continue;
    legacyRowByProgressId.set(progressId, row);
  }

  const cards: ContractorWorkCardModel[] = [];
  const workRowByCardId = new Map<string, ContractorWorkRow>();

  for (const inboxRow of inboxRows) {
    const progressId = trim(inboxRow.progressId);
    const matchedLegacyRow = progressId ? legacyRowByProgressId.get(progressId) ?? null : null;

    cards.push(
      buildContractorWorkCardModel({
        inboxRow,
        matchedLegacyRow,
      }),
    );
    workRowByCardId.set(
      inboxRow.workItemId,
      buildContractorTechnicalWorkRow({
        inboxRow,
        matchedLegacyRow,
      }),
    );
  }

  return {
    cards,
    workRowByCardId,
  };
}
