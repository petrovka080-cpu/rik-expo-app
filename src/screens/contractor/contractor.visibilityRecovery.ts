import type {
  ContractorInboxRow,
  ContractorInboxScope,
} from "../../lib/api/contractor.scope.service";
import { normalizeRuText } from "../../lib/text/encoding";
import type { ContractorProfileCard } from "./contractor.profileService";
import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "./contractor.loadWorksService";

export type ContractorScreenState = "ready" | "empty" | "error" | "degraded";
export type ContractorScreenSource = "canonical" | "compatibility_recovery" | "none";
export type ContractorScreenRenderState =
  | "ready_current"
  | "ready_current_degraded_title"
  | "ready_compat_degraded"
  | "empty"
  | "error";

export type ContractorScreenContract = {
  state: ContractorScreenState;
  source: ContractorScreenSource;
  renderState: ContractorScreenRenderState;
  hasCanonicalRows: boolean;
  hasCompatibilityRows: boolean;
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

const firstNonEmptyText = (...values: Array<unknown>): string | null => {
  const value = firstNonEmpty(...values);
  if (!value) return null;
  const normalized = String(normalizeRuText(value)).trim();
  return normalized || null;
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

const isApprovedSubcontractCard = (card: ContractorSubcontractCard): boolean =>
  trim(card.id) !== "" && trim(card.status).toLowerCase() === "approved";

const isRenderableCompatibilityCard = (
  card: ContractorSubcontractCard,
  matchedRow: ContractorWorkRow | null,
): boolean =>
  isApprovedSubcontractCard(card) &&
  Boolean(firstNonEmpty(card.work_type, matchedRow?.work_name, matchedRow?.work_code)) &&
  Boolean(firstNonEmpty(card.object_name, matchedRow?.object_name));

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

  return subcontractCards
    .filter((card) => {
      const subcontractId = trim(card.id);
      const matchedRow = rowBySubcontractId.get(subcontractId) ?? null;
      return isRenderableCompatibilityCard(card, matchedRow);
    })
    .map((card) => {
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
          contractorName: firstNonEmptyText(
            card.contractor_org,
            matchedRow?.contractor_org,
            contractor?.company_name,
            contractor?.full_name,
            "РџРѕРґСЂСЏРґС‡РёРє",
          )!,
          contractorInn: firstNonEmptyText(card.contractor_inn, matchedRow?.contractor_inn, contractor?.inn),
          contractNumber: firstNonEmptyText(card.contract_number),
          contractDate: firstNonEmptyText(card.contract_date),
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
          workName: firstNonEmptyText(card.work_type, matchedRow?.work_name, matchedRow?.work_code, "Р Р°Р±РѕС‚Р°")!,
          workNameSource: card.work_type ? "snapshot" : matchedRow?.work_name ? "snapshot" : "raw_code",
          quantity: Number.isFinite(quantity) ? quantity : null,
          uom: firstNonEmptyText(card.uom, matchedRow?.uom_id),
          unitPrice,
          totalAmount,
          isMaterial: false,
        },
        location: {
          objectId: firstNonEmpty(matchedRow?.request_id),
          objectName: firstNonEmptyText(card.object_name, matchedRow?.object_name, "РћР±СЉРµРєС‚")!,
          systemName: null,
          zoneName: null,
          floorName: null,
          locationDisplay: firstNonEmptyText(card.object_name, matchedRow?.object_name, "РћР±СЉРµРєС‚")!,
        },
        diagnostics: {
          sourceVersion: "compat:contractor_visibility_recovery_v1",
          currentWorkState: "ready_current_degraded_title",
          contractorNameSource: "subcontract_snapshot",
          objectNameSource: "subcontract_snapshot",
          eligibility: {
            isApprovedWork: true,
            isCurrentVisibleWork: true,
            isLegacyHistoricalRow: false,
            hasHumanTitle: true,
            hasCurrentObjectContext: true,
          },
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
    work_name: item.work.workName,
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
  canonicalMeta?: ContractorInboxScope["meta"] | null;
  compatibilityRows: ContractorInboxRow[];
  hasContractorIdentity: boolean;
  loadError: unknown | null;
}): ContractorScreenContract {
  const { canonicalRows, canonicalMeta, compatibilityRows, hasContractorIdentity, loadError } = params;

  if (loadError) {
    return {
      state: "error",
      source: "none",
      renderState: "error",
      hasCanonicalRows: false,
      hasCompatibilityRows: false,
      message: "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРЅС‹Рµ РїРѕРґСЂСЏРґРЅС‹Рµ СЂР°Р±РѕС‚С‹.",
    };
  }

  if (!hasContractorIdentity) {
    return {
      state: "degraded",
      source: "none",
      renderState: "error",
      hasCanonicalRows: false,
      hasCompatibilityRows: false,
      message: "РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РїСЂРѕС„РёР»СЊ РїРѕРґСЂСЏРґС‡РёРєР°. РќР°Р·РЅР°С‡РµРЅРЅС‹Рµ СЂР°Р±РѕС‚С‹ РјРѕРіСѓС‚ Р±С‹С‚СЊ РЅРµРґРѕСЃС‚СѓРїРЅС‹.",
    };
  }

  if (canonicalRows.length > 0) {
    const readyCurrentRows =
      canonicalMeta?.readyCurrentRows ??
      canonicalRows.filter((row) => row.diagnostics.currentWorkState === "ready_current").length;
    const readyCurrentDegradedTitle =
      canonicalMeta?.readyCurrentDegradedTitle ??
      canonicalRows.filter((row) => row.diagnostics.currentWorkState === "ready_current_degraded_title").length;
    const legacyFilteredOut = canonicalMeta?.legacyFilteredOut ?? 0;
    const historicalExcluded = canonicalMeta?.historicalExcluded ?? 0;
    const degradedOnly = readyCurrentRows === 0 && readyCurrentDegradedTitle > 0;

    return {
      state: degradedOnly ? "degraded" : "ready",
      source: "canonical",
      renderState: degradedOnly ? "ready_current_degraded_title" : "ready_current",
      hasCanonicalRows: true,
      hasCompatibilityRows: compatibilityRows.length > 0,
      message: degradedOnly
        ? "Canonical contractor rows are available, but some titles still resolve in degraded mode."
        : legacyFilteredOut > 0 || historicalExcluded > 0
          ? "Canonical source filtered legacy or historical subcontract rows out of the primary list."
          : null,
    };
  }

  if (compatibilityRows.length > 0) {
    return {
      state: "degraded",
      source: "compatibility_recovery",
      renderState: "ready_compat_degraded",
      hasCanonicalRows: false,
      hasCompatibilityRows: true,
      message: "Р Р°Р±РѕС‚С‹ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅС‹ С‡РµСЂРµР· СЃРѕРІРјРµСЃС‚РёРјС‹Р№ РїРѕРґСЂСЏРґРЅС‹Р№ scope. Р”РµС‚Р°Р»Рё РјРѕРіСѓС‚ Р·Р°РіСЂСѓР¶Р°С‚СЊСЃСЏ С‡Р°СЃС‚РёС‡РЅРѕ.",
    };
  }

  return {
    state: "empty",
    source: "none",
    renderState: "empty",
    hasCanonicalRows: false,
    hasCompatibilityRows: false,
    message: "РќРµС‚ РЅР°Р·РЅР°С‡РµРЅРЅС‹С… РїРѕРґСЂСЏРґРЅС‹С… СЂР°Р±РѕС‚.",
  };
}
