import { useMemo } from "react";
import type { ComponentProps } from "react";
import ActBuilderModal from "../components/ActBuilderModal";

type ActBuilderModalCoreProps = Omit<
  ComponentProps<typeof ActBuilderModal>,
  "visible" | "onClose" | "onDismiss" | "modalHeaderTopPad"
>;

type Params = {
  actBuilderSelectedWorkCount: number;
  actBuilderSelectedMatCount: number;
  handleToggleExpandedWork: ActBuilderModalCoreProps["onToggleExpandedWork"];
  handleToggleExpandedMat: ActBuilderModalCoreProps["onToggleExpandedMat"];
  handleActWorkToggleInclude: ActBuilderModalCoreProps["onToggleIncludeWork"];
  handleActWorkQtyChange: ActBuilderModalCoreProps["onQtyChangeWork"];
  handleActWorkUnitChange: ActBuilderModalCoreProps["onUnitChangeWork"];
  handleActWorkPriceChange: ActBuilderModalCoreProps["onPriceChangeWork"];
  handleActMatToggleInclude: ActBuilderModalCoreProps["onToggleIncludeMat"];
  handleActMatDecrement: ActBuilderModalCoreProps["onDecrementMat"];
  handleActMatIncrement: ActBuilderModalCoreProps["onIncrementMat"];
  handleActMatPriceChange: ActBuilderModalCoreProps["onPriceChangeMat"];
  actBuilderSaving: ActBuilderModalCoreProps["saving"];
  actBuilderHint: ActBuilderModalCoreProps["hint"];
  actBuilderHasSelected: ActBuilderModalCoreProps["hasSelected"];
  actBuilderCanSubmit: ActBuilderModalCoreProps["canSubmit"];
  submitActBuilder: ActBuilderModalCoreProps["onSubmit"];
} & Omit<
  ActBuilderModalCoreProps,
  | "selectedWorkCount"
  | "selectedMatCount"
  | "onToggleExpandedWork"
  | "onToggleExpandedMat"
  | "onToggleIncludeWork"
  | "onQtyChangeWork"
  | "onUnitChangeWork"
  | "onPriceChangeWork"
  | "onToggleIncludeMat"
  | "onDecrementMat"
  | "onIncrementMat"
  | "onPriceChangeMat"
  | "saving"
  | "hint"
  | "hasSelected"
  | "canSubmit"
  | "onSubmit"
>;

export function useContractorActBuilderModalProps(params: Params): ActBuilderModalCoreProps {
  return useMemo(
    () => ({
      jobHeader: params.jobHeader,
      resolvedObjectName: params.resolvedObjectName,
      actBuilderDateText: params.actBuilderDateText,
      selectedWorkCount: params.actBuilderSelectedWorkCount,
      selectedMatCount: params.actBuilderSelectedMatCount,
      actBuilderMatSum: params.actBuilderMatSum,
      actBuilderWorkSum: params.actBuilderWorkSum,
      works: params.works,
      items: params.items,
      expandedWorkId: params.expandedWorkId,
      expandedMatId: params.expandedMatId,
      onToggleExpandedWork: params.handleToggleExpandedWork,
      onToggleExpandedMat: params.handleToggleExpandedMat,
      onToggleIncludeWork: params.handleActWorkToggleInclude,
      onQtyChangeWork: params.handleActWorkQtyChange,
      onUnitChangeWork: params.handleActWorkUnitChange,
      onPriceChangeWork: params.handleActWorkPriceChange,
      onToggleIncludeMat: params.handleActMatToggleInclude,
      onDecrementMat: params.handleActMatDecrement,
      onIncrementMat: params.handleActMatIncrement,
      onPriceChangeMat: params.handleActMatPriceChange,
      saving: params.actBuilderSaving,
      hint: params.actBuilderHint,
      hasSelected: params.actBuilderHasSelected,
      canSubmit: params.actBuilderCanSubmit,
      onSubmit: params.submitActBuilder,
    }),
    [
      params.jobHeader,
      params.resolvedObjectName,
      params.actBuilderDateText,
      params.actBuilderSelectedWorkCount,
      params.actBuilderSelectedMatCount,
      params.actBuilderMatSum,
      params.actBuilderWorkSum,
      params.works,
      params.items,
      params.expandedWorkId,
      params.expandedMatId,
      params.handleToggleExpandedWork,
      params.handleToggleExpandedMat,
      params.handleActWorkToggleInclude,
      params.handleActWorkQtyChange,
      params.handleActWorkUnitChange,
      params.handleActWorkPriceChange,
      params.handleActMatToggleInclude,
      params.handleActMatDecrement,
      params.handleActMatIncrement,
      params.handleActMatPriceChange,
      params.actBuilderSaving,
      params.actBuilderHint,
      params.actBuilderHasSelected,
      params.actBuilderCanSubmit,
      params.submitActBuilder,
    ],
  );
}
