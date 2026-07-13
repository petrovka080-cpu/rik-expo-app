import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import type { ContractorInboxRow } from "../../../lib/api/contractor.scope.service";
import {
  buildContractorCardModels,
  type ContractorWorkCardModel,
} from "../contractor.cardModel";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import { looksLikeUuid } from "../contractor.utils";

type Params = {
  inboxRows: ContractorInboxRow[];
  rows: ContractorWorkRow[];
  openWorkAddModal: (row: ContractorWorkRow, readOnly?: boolean) => void;
};

export function useContractorCards(params: Params) {
  const { inboxRows, rows, openWorkAddModal } = params;

  const contractorCardModels = useMemo(
    () =>
      buildContractorCardModels({
        inboxRows,
        rows,
      }),
    [inboxRows, rows],
  );

  const handleOpenUnifiedCard = useCallback(
    (id: string) => {
      const row = contractorCardModels.workRowByCardId.get(String(id || "").trim()) ?? null;
      if (!row) {
        Alert.alert("Данные недоступны", "Не удалось открыть подрядную работу.");
        return;
      }
      const progressId = String(row.progress_id || "").trim();
      const readOnly = !looksLikeUuid(progressId);
      openWorkAddModal(row, readOnly);
    },
    [contractorCardModels.workRowByCardId, openWorkAddModal],
  );

  return {
    contractorWorkCards: contractorCardModels.cards as ContractorWorkCardModel[],
    handleOpenUnifiedCard,
  };
}
