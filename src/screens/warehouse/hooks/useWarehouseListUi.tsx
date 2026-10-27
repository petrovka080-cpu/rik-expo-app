import React, { useCallback, useMemo } from "react";
import { RefreshControl, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import {
  formatWarehouseRuDate,
  selectWarehouseListContentStyle,
  selectWarehouseListOnScroll,
  selectWarehouseListScrollEventThrottle,
} from "../warehouse.list.ui";

export function useWarehouseListUi(params: {
  headerMax: number;
  refreshing: boolean;
  onRefresh: () => void;
  isWeb: boolean;
  onListScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const { headerMax, refreshing, onRefresh, isWeb, onListScroll } = params;

  const listContentStyle = useMemo(
    () => selectWarehouseListContentStyle(headerMax),
    [headerMax],
  );

  const listRefreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  const listOnScroll = useMemo(
    () => selectWarehouseListOnScroll({ isWeb, onListScroll }),
    [isWeb, onListScroll],
  );

  const listScrollEventThrottle = useMemo(
    () => selectWarehouseListScrollEventThrottle(isWeb),
    [isWeb],
  );

  const fmtRuDate = useCallback((iso?: string | null) => {
    return formatWarehouseRuDate(iso);
  }, []);

  return {
    listContentStyle,
    listRefreshControl,
    listOnScroll,
    listScrollEventThrottle,
    fmtRuDate,
  };
}
