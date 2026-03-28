import { useContractorRealtimeLifecycle } from "../contractor.realtime.lifecycle";
import { useContractorRefreshLifecycle } from "./useContractorRefreshLifecycle";
import { useContractorScreenData } from "./useContractorScreenData";
import { useContractorWorkRows } from "./useContractorWorkRows";

type ScreenDataParams = Parameters<typeof useContractorScreenData>[0];
type WorkRowsParams = Parameters<typeof useContractorWorkRows>[0];
type RefreshParams = Omit<
  Parameters<typeof useContractorRefreshLifecycle>[0],
  "reloadContractorScreenData"
>;

export function useContractorHomeController(params: {
  screenData: ScreenDataParams;
  workRows: WorkRowsParams;
  refresh: RefreshParams;
}) {
  const { screenData, workRows, refresh } = params;

  const {
    loadWorks,
    reloadContractorScreenData,
    refreshVisibleContractorScopes,
    isContractorRefreshInFlight,
  } = useContractorScreenData(screenData);

  const { availableRows, myRows } = useContractorWorkRows(workRows);

  const { handleRefresh } = useContractorRefreshLifecycle({
    ...refresh,
    reloadContractorScreenData,
  });

  useContractorRealtimeLifecycle({
    focusedRef: refresh.focusedRef,
    refreshVisibleContractorScopes,
    isRefreshInFlight: isContractorRefreshInFlight,
  });

  return {
    loadWorks,
    reloadContractorScreenData,
    availableRows,
    myRows,
    handleRefresh,
  };
}
