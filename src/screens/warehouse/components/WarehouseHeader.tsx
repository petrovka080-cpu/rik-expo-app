import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, Platform } from "react-native";
import { UI, s } from "../warehouse.styles";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

type AnimNum = number | Animated.Value | Animated.AnimatedInterpolation<number>;
const WAREHOUSE_TAB_LABELS = [
  "\u041a \u043f\u0440\u0438\u0445\u043e\u0434\u0443",
  "\u0421\u043a\u043b\u0430\u0434 \u0444\u0430\u043a\u0442",
  "\u0420\u0430\u0441\u0445\u043e\u0434",
  "\u041e\u0442\u0447\u0451\u0442\u044b",
] as const;

export type WarehouseHeaderApi = {
  headerHeight: AnimNum;
  headerTranslateY: AnimNum;
  titleSize: AnimNum;
  headerShadowSafe: AnimNum;
  onListScroll?: ReturnType<typeof Animated.event>;
};

export function useWarehouseHeaderApi(args: {
  isWeb: boolean;
  hasSubRow?: boolean;
}): WarehouseHeaderApi {
  const { isWeb, hasSubRow = false } = args;

  const HEADER_MAX = hasSubRow ? 130 : 92;
  const HEADER_MIN = hasSubRow ? 92 : 72;
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

  const scrollY = useRef(new Animated.Value(0)).current;

  const clampedY = useMemo(() => Animated.diffClamp(scrollY, 0, HEADER_SCROLL), [scrollY, HEADER_SCROLL]);

  const headerHeight = isWeb
    ? HEADER_MAX
    : clampedY.interpolate({
      inputRange: [0, HEADER_SCROLL],
      outputRange: [HEADER_MAX, HEADER_MIN],
      extrapolate: "clamp",
    });

  const headerTranslateY = isWeb
    ? clampedY.interpolate({
      inputRange: [0, HEADER_SCROLL],
      outputRange: [0, -HEADER_SCROLL],
      extrapolate: "clamp",
    })
    : 0;

  const titleSize = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [22, 18],
    extrapolate: "clamp",
  });

  const headerShadow = clampedY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 0.12],
    extrapolate: "clamp",
  });

  const headerShadowSafe = isWeb ? 0 : headerShadow;

  const onListScroll = useMemo(() => {
    if (isWeb) return undefined;
    return Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: false,
    });
  }, [scrollY, isWeb]);

  return { headerHeight, headerTranslateY, titleSize, headerShadowSafe, onListScroll };
}

export default function WarehouseHeader(props: {
  tab: Tab;
  onTab: (t: Tab) => void;
  incomingCount: number;
  stockCount: number;
  titleSize: AnimNum;
  warehousemanFio?: string;
  onOpenFioModal?: () => void;
}) {
  const { tab, onTab, incomingCount, stockCount, titleSize, warehousemanFio, onOpenFioModal } = props;
  const tabDisplayByValue = useMemo(
    () =>
      new Map<Tab, string>([
        [WAREHOUSE_TABS[0], WAREHOUSE_TAB_LABELS[0]],
        [WAREHOUSE_TABS[1], WAREHOUSE_TAB_LABELS[1]],
        [WAREHOUSE_TABS[2], WAREHOUSE_TAB_LABELS[2]],
        [WAREHOUSE_TABS[3], WAREHOUSE_TAB_LABELS[3]],
      ]),
    [],
  );

  const tabLabel = useMemo(
    () => (t: Tab) => {
      const display = tabDisplayByValue.get(t) ?? String(t);
      if (t === WAREHOUSE_TABS[0]) return `${display} (${incomingCount})`;
      if (t === WAREHOUSE_TABS[1]) return `${display} (${stockCount})`;
      return display;
    },
    [incomingCount, stockCount, tabDisplayByValue],
  );

  const headerTitle = tabDisplayByValue.get(tab) ?? String(tab);

  return (
    <View>
      <View style={{ paddingHorizontal: 16 }}>
        <Animated.Text style={[s.collapsingTitle, { fontSize: titleSize, marginBottom: 0 }]} numberOfLines={1}>
          {headerTitle}
        </Animated.Text>
        {!!warehousemanFio && (
          <Pressable onPress={onOpenFioModal} style={{ marginTop: 4, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: UI.sub, fontWeight: "500", opacity: 0.9 }}>
              {warehousemanFio}
            </Text>
          </Pressable>
        )}
        {!warehousemanFio && <View style={{ height: 12 }} />}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 2 }}
      >
        {WAREHOUSE_TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => onTab(t)}
              style={[s.tab, active && s.tabActive]}
            >
              <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "500", fontSize: 13 }}>
                {tabLabel(t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
