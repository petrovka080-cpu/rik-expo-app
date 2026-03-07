import React, { useCallback, useMemo } from "react";
import { RefreshControl, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

export function useWarehouseListUi(params: {
  headerMax: number;
  refreshing: boolean;
  onRefresh: () => void;
  isWeb: boolean;
  onListScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const { headerMax, refreshing, onRefresh, isWeb, onListScroll } = params;

  const listContentStyle = useMemo(
    () => ({ paddingTop: headerMax + 12, paddingBottom: 24 }),
    [headerMax],
  );

  const listRefreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  const listOnScroll = useMemo(
    () => (isWeb ? undefined : onListScroll),
    [isWeb, onListScroll],
  );

  const listScrollEventThrottle = useMemo(
    () => (isWeb ? undefined : 16),
    [isWeb],
  );

  const fmtRuDate = useCallback((iso?: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  return {
    listContentStyle,
    listRefreshControl,
    listOnScroll,
    listScrollEventThrottle,
    fmtRuDate,
  };
}
