import type { ContractorInboxRow } from "../../lib/api/contractor.scope.service";
import type { ContractorProfileCard } from "./contractor.profileService";
import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "./contractor.loadWorksService";

export type ContractorScreenState = "ready" | "empty" | "error" | "degraded";
export type ContractorScreenSource = "canonical" | "compatibility_recovery" | "none";

export type ContractorScreenContract = {
  state: ContractorScreenState;
  source: ContractorScreenSource;
  message: string | null;
};

const trim = (value: unknown) => String(value || "").trim();

const firstNonEmpty = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    const normalized = trim(value);
    if (normalized) return normalized;
  }
  return null;
};

const inferSourceKind = (row: ContractorWorkRow): ContractorInboxRow["origin"]["sourceKind"] => {
  const canonicalSourceKind = trim(row.canonical_source_kind);
  if (
    canonicalSourceKind === "buyer_subcontract" ||
    canonicalSourceKind === "foreman_subcontract_request" ||
    canonicalSourceKind === "foreman_material_request"
  ) {
    return canonicalSourceKind;
  }
  return trim(row.contractor_job_id) ? "foreman_subcontract_request" : "buyer_subcontract";
};

export function buildCompatibilityInboxRows(params: {
  rows: ContractorWorkRow[];
  subcontractCards: ContractorSubcontractCard[];
  contractor: ContractorProfileCard | null;
}): ContractorInboxRow[] {
  const { rows, subcontractCards, contractor } = params;
  const rowBySubcontractId = new Map<string, ContractorWorkRow>();

  for (const row of rows) {
    const subcontractId = trim(row.contractor_job_id);
    if (!subcontractId || rowBySubcontractId.has(subcontractId)) continue;
    rowBySubcontractId.set(subcontractId, row);
  }

  return subcontractCards.map((card) => {
    const subcontractId = trim(card.id);
    const matchedRow = rowBySubcontractId.get(subcontractId) ?? null;
    const quantity = matchedRow ? Number(matchedRow.qty_planned ?? 0) : Number(card.qty_planned ?? 0);
    const unitPrice =
      matchedRow?.unit_price == null
        ? null
        : Number.isFinite(Number(matchedRow.unit_price))
          ? Number(matchedRow.unit_price)
          : null;
    const totalAmount =
      unitPrice == null || !Number.isFinite(quantity)
        ? null
        : Number((unitPrice * quantity).toFixed(2));
    const workItemId = firstNonEmpty(
      matchedRow?.canonical_work_item_id,
      trim(matchedRow?.progress_id) && trim(matchedRow?.progress_id) !== subcontractId
        ? trim(matchedRow?.progress_id)
        : null,
      `subcontract:${subcontractId}`,
    )!;

    return {
      workItemId,
      progressId: firstNonEmpty(matchedRow?.progress_id),
      publicationState: "ready",
      identity: {
        contractorId: firstNonEmpty(contractor?.id, matchedRow?.contractor_id, subcontractId)!,
        contractorName: firstNonEmpty(
          matchedRow?.contractor_org,
          card.contractor_org,
          contractor?.company_name,
          contractor?.full_name,
          "Подрядчик",
        )!,
        contractorInn: firstNonEmpty(matchedRow?.contractor_inn, card.contractor_inn, contractor?.inn),
        contractNumber: firstNonEmpty(card.contract_number),
        contractDate: firstNonEmpty(card.contract_date),
      },
      origin: {
        sourceKind: matchedRow ? inferSourceKind(matchedRow) : "foreman_subcontract_request",
        sourceRequestId: firstNonEmpty(matchedRow?.request_id),
        sourceProposalId: null,
        sourceSubcontractId: subcontractId || null,
        directorApprovedAt: firstNonEmpty(matchedRow?.created_at, card.created_at, new Date(0).toISOString())!,
      },
      work: {
        workItemId,
        workName: firstNonEmpty(matchedRow?.work_name, matchedRow?.work_code, card.work_type, "Работа")!,
        workNameSource: matchedRow?.work_name ? "snapshot" : matchedRow?.work_code ? "raw_code" : "snapshot",
        quantity: Number.isFinite(quantity) ? quantity : null,
        uom: firstNonEmpty(matchedRow?.uom_id, card.uom),
        unitPrice,
        totalAmount,
        isMaterial: false,
      },
      location: {
        objectId: firstNonEmpty(matchedRow?.request_id),
        objectName: firstNonEmpty(matchedRow?.object_name, card.object_name, "Объект")!,
        systemName: null,
        zoneName: null,
        floorName: null,
        locationDisplay: firstNonEmpty(matchedRow?.object_name, card.object_name, "Объект")!,
      },
      diagnostics: {
        sourceVersion: "compat:contractor_visibility_recovery_v1",
      },
    };
  });
}

export function buildCompatibilityWorkRow(item: ContractorInboxRow): ContractorWorkRow {
  return {
    progress_id: item.progressId ?? item.workItemId,
    canonical_work_item_id: item.workItemId,
    canonical_source_kind: item.origin.sourceKind,
    created_at: item.origin.directorApprovedAt,
    purchase_item_id: null,
    work_code: item.work.workNameSource === "raw_code" ? item.work.workName : null,
    work_name: item.work.workNameSource === "raw_code" ? null : item.work.workName,
    object_name: item.location.objectName || item.location.locationDisplay,
    contractor_org: item.identity.contractorName,
    contractor_inn: item.identity.contractorInn,
    contractor_phone: null,
    request_id: item.origin.sourceRequestId,
    request_status: null,
    contractor_job_id: item.origin.sourceSubcontractId,
    uom_id: item.work.uom,
    qty_planned: Number(item.work.quantity ?? 0),
    qty_done: 0,
    qty_left: Number(item.work.quantity ?? 0),
    unit_price: item.work.unitPrice,
    work_status: "ready",
    contractor_id: item.identity.contractorId,
    started_at: null,
    finished_at: null,
  };
}

export function resolveContractorScreenContract(params: {
  canonicalRows: ContractorInboxRow[];
  compatibilityRows: ContractorInboxRow[];
  hasContractorIdentity: boolean;
  loadError: unknown | null;
}): ContractorScreenContract {
  const { canonicalRows, compatibilityRows, hasContractorIdentity, loadError } = params;

  if (loadError) {
    return {
      state: "error",
      source: "none",
      message: "Не удалось загрузить назначенные подрядные работы.",
    };
  }

  if (!hasContractorIdentity) {
    return {
      state: "degraded",
      source: "none",
      message: "Не удалось определить профиль подрядчика. Назначенные работы могут быть недоступны.",
    };
  }

  if (canonicalRows.length > 0) {
    return {
      state: "ready",
      source: "canonical",
      message: null,
    };
  }

  if (compatibilityRows.length > 0) {
    return {
      state: "degraded",
      source: "compatibility_recovery",
      message: "Работы восстановлены через совместимый подрядный scope. Детали могут загружаться частично.",
    };
  }

  return {
    state: "empty",
    source: "none",
    message: "Нет назначенных подрядных работ.",
  };
}
