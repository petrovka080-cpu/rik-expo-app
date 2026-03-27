import { useContractorIssuedRefresh } from "./useContractorIssuedRefresh";
import { useContractorPdfActions } from "./useContractorPdfActions";
import { useContractorWorkMaterialUi } from "./useContractorWorkMaterialUi";
import { useContractorWorkModalDataController } from "./useContractorWorkModalDataController";
import { useContractorWorkModalOpen } from "./useContractorWorkModalOpen";
import { useContractorWorkModals } from "./useContractorWorkModals";

type DataControllerParams = Parameters<typeof useContractorWorkModalDataController>[0];
type WorkModalOpenParams = Omit<
  Parameters<typeof useContractorWorkModalOpen>[0],
  "loadWorkLogData" | "resolveRequestId" | "resolveContractorJobId"
>;
type IssuedRefreshParams = Omit<
  Parameters<typeof useContractorIssuedRefresh>[0],
  "loadIssuedTodayDataForRow"
>;
type WorkModalsParams = Parameters<typeof useContractorWorkModals>[0];
type PdfActionsParams = Parameters<typeof useContractorPdfActions>[0];
type WorkMaterialUiParams = Parameters<typeof useContractorWorkMaterialUi>[0];

export function useContractorWorkModalController(params: {
  dataController: DataControllerParams;
  openModal: WorkModalOpenParams;
  issuedRefresh: IssuedRefreshParams;
  workModals: WorkModalsParams;
  pdfActions: PdfActionsParams;
  workMaterialUi: WorkMaterialUiParams;
}) {
  const { dataController, openModal, issuedRefresh, workModals, pdfActions, workMaterialUi } =
    params;

  const {
    loadWorkLogData,
    resolveRequestId,
    resolveContractorJobId,
    loadIssuedTodayDataForRow,
  } = useContractorWorkModalDataController(dataController);

  const { openWorkAddModal } = useContractorWorkModalOpen({
    ...openModal,
    loadWorkLogData,
    resolveRequestId,
    resolveContractorJobId,
  });

  useContractorIssuedRefresh({
    ...issuedRefresh,
    loadIssuedTodayDataForRow,
  });

  const {
    closeWorkModal,
    openContractDetailsModal,
    openEstimateMaterialsModal,
    closeContractDetailsModal,
    closeEstimateMaterialsModal,
    closeWorkStagePickerModal,
    onAnyModalDismissed,
    queueAfterClosingModals,
  } = useContractorWorkModals(workModals);

  const { resolvedObjectName, handleGenerateSummaryPdf, handleGenerateHistoryPdf } =
    useContractorPdfActions(pdfActions);

  const { renderWorkSearchItem, renderWorkStageItem } =
    useContractorWorkMaterialUi(workMaterialUi);

  return {
    openWorkAddModal,
    resolveRequestId,
    resolveContractorJobId,
    closeWorkModal,
    openContractDetailsModal,
    openEstimateMaterialsModal,
    closeContractDetailsModal,
    closeEstimateMaterialsModal,
    closeWorkStagePickerModal,
    onAnyModalDismissed,
    queueAfterClosingModals,
    resolvedObjectName,
    handleGenerateSummaryPdf,
    handleGenerateHistoryPdf,
    renderWorkSearchItem,
    renderWorkStageItem,
  };
}
