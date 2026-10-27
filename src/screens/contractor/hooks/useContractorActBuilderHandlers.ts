import { useCallback } from "react";
import { Alert } from "react-native";
import type { Dispatch } from "react";
import type { ActBuilderAction } from "../contractor.actBuilderReducer";

type ActBuilderStateLike = {
  items: { qty?: number | null; qtyMax: number }[];
};

export function useContractorActBuilderHandlers(params: {
  actBuilderState: ActBuilderStateLike;
  dispatchActBuilder: Dispatch<ActBuilderAction>;
}) {
  const { actBuilderState, dispatchActBuilder } = params;

  const handleActWorkToggleInclude = useCallback(
    (idx: number) => {
      dispatchActBuilder({ type: "TOGGLE_WORK_INCLUDE", payload: { index: idx } });
    },
    [dispatchActBuilder],
  );

  const handleActWorkQtyChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(String(txt).replace(",", "."));
      if (!Number.isFinite(num)) return;
      dispatchActBuilder({ type: "SET_WORK_QTY", payload: { index: idx, qty: num } });
    },
    [dispatchActBuilder],
  );

  const handleActWorkUnitChange = useCallback(
    (idx: number, txt: string) => {
      dispatchActBuilder({ type: "SET_WORK_UNIT", payload: { index: idx, unit: txt } });
    },
    [dispatchActBuilder],
  );

  const handleActWorkPriceChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(txt.replace(",", "."));
      dispatchActBuilder({
        type: "SET_WORK_PRICE",
        payload: { index: idx, price: Number.isFinite(num) ? num : null },
      });
    },
    [dispatchActBuilder],
  );

  const handleActMatToggleInclude = useCallback(
    (idx: number) => {
      dispatchActBuilder({ type: "TOGGLE_MAT_INCLUDE", payload: { index: idx } });
    },
    [dispatchActBuilder],
  );

  const handleActMatDecrement = useCallback(
    (idx: number) => {
      const current = actBuilderState.items[idx];
      if (!current) return;
      dispatchActBuilder({
        type: "SET_MAT_QTY",
        payload: { index: idx, qty: Math.max(0, Number(current.qty || 0) - 1) },
      });
    },
    [actBuilderState.items, dispatchActBuilder],
  );

  const handleActMatIncrement = useCallback(
    (idx: number) => {
      const current = actBuilderState.items[idx];
      if (!current) return;
      const newVal = Number(current.qty || 0) + 1;
      if (newVal > current.qtyMax) {
        Alert.alert(
          "Превышение лимита",
          `Нельзя списать больше доступного количества (${current.qtyMax}).`,
        );
        return;
      }
      dispatchActBuilder({ type: "SET_MAT_QTY", payload: { index: idx, qty: newVal } });
    },
    [actBuilderState.items, dispatchActBuilder],
  );

  const handleActMatPriceChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(String(txt).replace(",", "."));
      dispatchActBuilder({
        type: "SET_MAT_PRICE",
        payload: { index: idx, price: Number.isFinite(num) ? num : null },
      });
    },
    [dispatchActBuilder],
  );

  const handleToggleExpandedWork = useCallback(
    (id: string) => dispatchActBuilder({ type: "TOGGLE_EXPANDED_WORK", payload: { id } }),
    [dispatchActBuilder],
  );

  const handleToggleExpandedMat = useCallback(
    (id: string) => dispatchActBuilder({ type: "TOGGLE_EXPANDED_MAT", payload: { id } }),
    [dispatchActBuilder],
  );

  return {
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
  };
}
