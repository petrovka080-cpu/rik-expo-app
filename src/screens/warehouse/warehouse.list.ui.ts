import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function selectWarehouseListContentStyle(headerMax: number) {
  return { paddingTop: headerMax + 12, paddingBottom: 24 };
}

export function selectWarehouseListOnScroll(params: {
  isWeb: boolean;
  onListScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  return params.isWeb ? undefined : params.onListScroll;
}

export function selectWarehouseListScrollEventThrottle(isWeb: boolean) {
  return isWeb ? undefined : 16;
}

export function formatWarehouseRuDate(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
