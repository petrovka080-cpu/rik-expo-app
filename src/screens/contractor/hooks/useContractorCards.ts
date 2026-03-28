import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import type { ContractorInboxRow } from "../../../lib/api/contractor.scope.service";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import { looksLikeUuid } from "../contractor.utils";

type Params = {
  inboxRows: ContractorInboxRow[];
  rows: ContractorWorkRow[];
  openWorkAddModal: (row: ContractorWorkRow, readOnly?: boolean) => void;
};

type JobCard = {
  id: string;
  contractor: string;
  contractorInn?: string | null;
  objectName: string;
  workType: string;
};

const buildLegacyFallbackRow = (item: ContractorInboxRow): ContractorWorkRow => ({
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
});

export function useContractorCards(params: Params) {
  const { inboxRows, rows, openWorkAddModal } = params;

  const cardById = useMemo(
    () =>
      new Map(
        inboxRows.map((row) => [
          row.workItemId,
          {
            id: row.workItemId,
            contractor: row.identity.contractorName,
            contractorInn: row.identity.contractorInn,
            objectName: row.location.objectName || row.location.locationDisplay,
            workType: row.work.workName,
          } satisfies JobCard,
        ]),
      ),
    [inboxRows],
  );

  const workRowByCardId = useMemo(() => {
    const map = new Map<string, ContractorWorkRow>();
    for (const item of inboxRows) {
      const matchedLegacyRow =
        rows.find((row) => String(row.progress_id || "").trim() === String(item.progressId || "").trim()) ?? null;
      if (matchedLegacyRow) {
        map.set(item.workItemId, {
          ...matchedLegacyRow,
          canonical_work_item_id: item.workItemId,
          canonical_source_kind: item.origin.sourceKind,
          contractor_org: item.identity.contractorName,
          contractor_inn: item.identity.contractorInn,
          object_name: item.location.objectName || item.location.locationDisplay,
          work_name:
            item.work.workNameSource === "raw_code"
              ? matchedLegacyRow.work_name
              : item.work.workName,
          work_code:
            item.work.workNameSource === "raw_code"
              ? item.work.workName
              : matchedLegacyRow.work_code,
          request_id: item.origin.sourceRequestId ?? matchedLegacyRow.request_id,
          contractor_job_id: item.origin.sourceSubcontractId ?? matchedLegacyRow.contractor_job_id,
          contractor_id: item.identity.contractorId,
          unit_price: item.work.unitPrice ?? matchedLegacyRow.unit_price ?? null,
          qty_planned: Number(item.work.quantity ?? matchedLegacyRow.qty_planned ?? 0),
        });
        continue;
      }
      map.set(item.workItemId, buildLegacyFallbackRow(item));
    }
    return map;
  }, [inboxRows, rows]);

  const unifiedSubcontractCards = useMemo(
    () => inboxRows.map((row) => cardById.get(row.workItemId)!).filter(Boolean),
    [cardById, inboxRows],
  );

  const handleOpenUnifiedCard = useCallback(
    (id: string) => {
      const row = workRowByCardId.get(String(id || "").trim()) ?? null;
      if (!row) {
        Alert.alert("Данные недоступны", "Не удалось открыть подрядную работу.");
        return;
      }
      const progressId = String(row.progress_id || "").trim();
      const readOnly = !looksLikeUuid(progressId);
      openWorkAddModal(row, readOnly);
    },
    [openWorkAddModal, workRowByCardId],
  );

  return { unifiedSubcontractCards, handleOpenUnifiedCard };
}
