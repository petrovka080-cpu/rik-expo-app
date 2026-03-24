import { useCallback, useMemo, useRef } from "react";
import { Alert, Platform } from "react-native";
import type { ContractorSubcontractCard, ContractorWorkRow } from "../contractor.loadWorksService";
import { buildJobCards, buildUnifiedCardsFromJobsAndOthers, groupWorksByJob } from "../contractor.viewModels";
import { resolveWorkRowFromUnifiedCard } from "../contractor.openCard";
import { looksLikeUuid, normText, pickWorkProgressRow } from "../contractor.utils";

type Params = {
  rows: ContractorWorkRow[];
  myRows: ContractorWorkRow[];
  availableRows: ContractorWorkRow[];
  subcontractCards: ContractorSubcontractCard[];
  rowsReady: boolean;
  subcontractsReady: boolean;
  toHumanObject: (raw: string | null | undefined) => string;
  toHumanWork: (raw: string | null | undefined) => string;
  openWorkAddModal: (row: ContractorWorkRow, readOnly?: boolean) => void;
};

export function useContractorCards(params: Params) {
  const {
    rows,
    myRows,
    availableRows,
    subcontractCards,
    rowsReady,
    subcontractsReady,
    toHumanObject,
    toHumanWork,
    openWorkAddModal,
  } = params;

  const openingWorkRef = useRef(false);

  const unifiedRows = useMemo(() => {
    const ownSet = new Set(myRows.map((r) => String(r.progress_id)));
    const availableOnly = availableRows.filter((r) => !ownSet.has(String(r.progress_id)));
    return [...myRows, ...availableOnly];
  }, [myRows, availableRows]);

  const groupedWorksByJob = useMemo(() => groupWorksByJob(rows), [rows]);

  const otherRows = useMemo(
    () => unifiedRows.filter((r) => !String(r.contractor_job_id || "").trim()),
    [unifiedRows],
  );

  const jobCards = useMemo(() => {
    if (!rowsReady || !subcontractsReady) return [];
    return buildJobCards({
      subcontractCards,
      groupedWorksByJob,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
    });
  }, [subcontractCards, groupedWorksByJob, toHumanObject, toHumanWork, rowsReady, subcontractsReady]);

  const { cards: unifiedSubcontractCards, rowByCardId: otherRowByCardId } = useMemo(() => {
    return buildUnifiedCardsFromJobsAndOthers({
      jobCards,
      otherRows,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
    });
  }, [jobCards, otherRows, toHumanObject, toHumanWork]);

  const openWorkInOneClick = useCallback((row: ContractorWorkRow) => {
    if (openingWorkRef.current) return;
    const rpcProgressId = pickWorkProgressRow(row);
    if (__DEV__) {
      console.debug("[contractor.openWorkInOneClick]", {
        progressId: rpcProgressId,
        contractorJobId: String(row.contractor_job_id || "").trim() || null,
        requestId: String(row.request_id || "").trim() || null,
      });
    }
    if (!looksLikeUuid(rpcProgressId)) {
      if (__DEV__) {
        console.debug("[contractor.openWorkInOneClick.invalidProgress]", {
          progressId: rpcProgressId,
        });
      }
      Alert.alert(
        "\u041E\u0448\u0438\u0431\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445",
        "\u0414\u043B\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 progress_id.",
      );
      return;
    }
    openingWorkRef.current = true;
    try {
      openWorkAddModal(row);
    } finally {
      openingWorkRef.current = false;
    }
  }, [openWorkAddModal]);

  const handleOpenUnifiedCard = useCallback((id: string) => {
    const targetRow = resolveWorkRowFromUnifiedCard({
      id,
      otherRowByCardId,
      groupedWorksByJob,
      subcontractCards,
      rows,
      looksLikeUuid,
      pickWorkProgressRow,
    });
    if (__DEV__) {
      console.debug("[contractor.handleOpenUnifiedCard]", {
        id,
        found: !!targetRow,
        progressId: targetRow ? pickWorkProgressRow(targetRow) : null,
        contractorJobId: targetRow ? String(targetRow.contractor_job_id || "").trim() || null : null,
        requestId: targetRow ? String(targetRow.request_id || "").trim() || null : null,
      });
    }
    if (targetRow) {
      openWorkInOneClick(targetRow);
      return;
    }
    Alert.alert(
      "\u041D\u0435\u0442 \u0440\u0430\u0431\u043E\u0442 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F",
      "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u0430\u0437\u043D\u0430\u0447\u044C\u0442\u0435 \u0440\u0430\u0431\u043E\u0442\u0443 \u043D\u0430 \u043F\u043E\u0434\u0440\u044F\u0434 \u0438\u043B\u0438 \u0434\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438.",
    );
  }, [otherRowByCardId, groupedWorksByJob, subcontractCards, rows, openWorkInOneClick]);

  return { unifiedSubcontractCards, handleOpenUnifiedCard };
}
