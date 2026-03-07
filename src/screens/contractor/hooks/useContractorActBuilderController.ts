import { useContractorActBuilderHandlers } from "./useContractorActBuilderHandlers";
import { useContractorActBuilderOpen } from "./useContractorActBuilderOpen";
import { useContractorActBuilderStats } from "./useContractorActBuilderStats";
import { useContractorActBuilderSubmit } from "./useContractorActBuilderSubmit";

type ActBuilderHandlersParams = Parameters<typeof useContractorActBuilderHandlers>[0];
type ActBuilderOpenParams = Parameters<typeof useContractorActBuilderOpen>[0];
type ActBuilderStatsParams = Parameters<typeof useContractorActBuilderStats>[0];
type ActBuilderSubmitParams = Parameters<typeof useContractorActBuilderSubmit>[0];
type ActBuilderSubmitParamsWithoutCount = Omit<
  ActBuilderSubmitParams,
  "actBuilderSelectedMatCount"
>;

export function useContractorActBuilderController(params: {
  handlers: ActBuilderHandlersParams;
  open: ActBuilderOpenParams;
  stats: ActBuilderStatsParams;
  submit: ActBuilderSubmitParamsWithoutCount;
}) {
  const { handlers, open, stats, submit } = params;

  const {
    handleActWorkToggleInclude,
    handleActWorkQtyChange,
    handleActWorkUnitChange,
    handleActWorkPriceChange,
    handleActMatToggleInclude,
    handleActMatDecrement,
    handleActMatIncrement,
    handleActMatPriceChange,
    handleToggleExpandedWork,
    handleToggleExpandedMat,
  } = useContractorActBuilderHandlers(handlers);

  const { openActBuilder } = useContractorActBuilderOpen(open);

  const {
    actBuilderSelectedMatCount,
    actBuilderSelectedWorkCount,
    actBuilderHasSelected,
    actBuilderCanSubmit,
    actBuilderDateText,
    actBuilderWorkSum,
    actBuilderMatSum,
  } = useContractorActBuilderStats(stats);

  const { submitActBuilder } = useContractorActBuilderSubmit({
    ...submit,
    actBuilderSelectedMatCount,
  });

  return {
    openActBuilder,
    submitActBuilder,
    handleActWorkToggleInclude,
    handleActWorkQtyChange,
    handleActWorkUnitChange,
    handleActWorkPriceChange,
    handleActMatToggleInclude,
    handleActMatDecrement,
    handleActMatIncrement,
    handleActMatPriceChange,
    handleToggleExpandedWork,
    handleToggleExpandedMat,
    actBuilderSelectedMatCount,
    actBuilderSelectedWorkCount,
    actBuilderHasSelected,
    actBuilderCanSubmit,
    actBuilderDateText,
    actBuilderWorkSum,
    actBuilderMatSum,
  };
}
