import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, Platform } from "react-native";
import { UI, s } from "../warehouse.styles";
import type { Tab } from "../warehouse.types";

const TABS: Tab[] = ["К приходу", "Склад факт", "Расход", "Отчёты"];

export type WarehouseHeaderApi = {
  headerHeight: any;
  headerTranslateY: any;
  titleSize: any;
  headerShadowSafe: any;
  onListScroll?: any;
};

export function useWarehouseHeaderApi(args: {
  isWeb: boolean;
  hasSubRow?: boolean;
}) : WarehouseHeaderApi {
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
    outputRange: [24, 16],
    extrapolate: "clamp",
  });

  const headerShadow = clampedY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 0.12],
    extrapolate: "clamp",
  });

  const headerShadowSafe = isWeb ? 0 : headerShadow;

  const onListScroll = useMemo(() => {
    if (isWeb) return undefined as any;
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
  titleSize: any;
}) {
  const { tab, onTab, incomingCount, stockCount, titleSize } = props;

  const tabLabel = useMemo(
    () => (t: Tab) => {
      if (t === "К приходу") return `К приходу (${incomingCount})`;
      if (t === "Склад факт") return `Склад факт (${stockCount})`;
      return t;
    },
    [incomingCount, stockCount],
  );

  const headerTitle =
    tab === "К приходу" ? "К приходу" :
    tab === "Склад факт" ? "Склад факт" :
    tab === "Расход" ? "Расход" :
    "Отчёты";

  return (
    <View>
      <Animated.Text style={[s.collapsingTitle, { fontSize: titleSize }]} numberOfLines={1}>
        {headerTitle}
      </Animated.Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => onTab(t)}
              style={[s.tab, active && s.tabActive]}
            >
              <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "800" }}>
                {tabLabel(t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
