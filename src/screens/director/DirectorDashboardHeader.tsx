import React from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  type FlatList,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { FlashList } from "@/src/ui/FlashList";

import { officeRoleChrome } from "../office/officeRoleChrome";
import { reportDirectorTopTabsScrollFailure } from "./director.observability";
import { UI, s } from "./director.styles";
import type { DirTopTab } from "./director.types";

export type DirectorDashboardRequestTab = "foreman" | "buyer";

type TopTabItem = { key: DirTopTab; label: string };
type TopTabsListRef = { scrollToOffset?: (params: { offset: number; animated?: boolean }) => void };

type Props = {
  buyerPositionsCount: number;
  buyerPropsCount: number;
  closeSheet: () => void;
  dirTab: DirTopTab;
  foremanPositionsCount: number;
  foremanRequestsCount: number;
  loadingProps: boolean;
  loadingRows: boolean;
  setDirTab: (t: DirTopTab) => void;
  setTab: (t: DirectorDashboardRequestTab) => void;
  subOpacity: Animated.AnimatedInterpolation<number> | number;
  tab: DirectorDashboardRequestTab;
  titleSize: Animated.AnimatedInterpolation<number> | number;
};

const HEADER_TITLE = "Контроль";

const DIRECTOR_TOP_TAB_TEST_IDS = [
  "requests",
  "subcontracts",
  "finance",
  "warehouse",
  "reports",
] as const;

const DIRECTOR_TOP_TABS: TopTabItem[] = [
  { key: "Заявки", label: "Заявки" },
  { key: "Подряды", label: "Подряды" },
  { key: "Финансы", label: "Финансы" },
  { key: "Склад", label: "Склад" },
  { key: "Отчёты", label: "Отчёты" },
];

const DIRECTOR_TOP_TABS_FLATLIST_TUNING = {
  initialNumToRender: 5,
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 32,
  windowSize: 3,
  removeClippedSubviews: false,
} as const;

const DIRECTOR_TOP_TABS_CONTENT_CONTAINER_STYLE: StyleProp<ViewStyle> = [
  officeRoleChrome.switcherRow,
  {
    paddingTop: 2,
    paddingBottom: 2,
    alignItems: "center",
    paddingRight: 12,
  },
];

const directorTopTabKeyExtractor = (item: TopTabItem) => item.key;

export default function DirectorDashboardHeader({
  buyerPositionsCount,
  buyerPropsCount,
  closeSheet,
  dirTab,
  foremanPositionsCount,
  foremanRequestsCount,
  loadingProps,
  loadingRows,
  setDirTab,
  setTab,
  subOpacity,
  tab,
  titleSize,
}: Props) {
  const topTabsRef = React.useRef<FlatList<TopTabItem> | null>(null);
  const topTabXRef = React.useRef<Record<string, { x: number; w: number }>>({});

  const onTopTabLayout = React.useCallback((key: string, e: { nativeEvent?: { layout?: { x?: number; width?: number } } }) => {
    const x = Number(e?.nativeEvent?.layout?.x ?? 0);
    const w = Number(e?.nativeEvent?.layout?.width ?? 0);
    topTabXRef.current[key] = { x, w };
  }, []);

  React.useEffect(() => {
    const sv = topTabsRef.current as TopTabsListRef | null;
    const rec = topTabXRef.current?.[dirTab];
    if (!sv || !rec) return;
    if (typeof sv.scrollToOffset !== "function") return;
    try {
      sv.scrollToOffset({ offset: Math.max(0, rec.x - 12), animated: true });
    } catch (error) {
      reportDirectorTopTabsScrollFailure(error);
    }
  }, [dirTab]);

  return (
    <View>
      <Animated.Text style={[s.collapsingTitle, { fontSize: titleSize }]} numberOfLines={1}>
        {HEADER_TITLE}
      </Animated.Text>

      <View style={[officeRoleChrome.switcherShell, { marginTop: 12 }]}>
        <FlashList
          ref={topTabsRef}
          data={DIRECTOR_TOP_TABS}
          keyExtractor={directorTopTabKeyExtractor}
          estimatedItemSize={112}
          {...DIRECTOR_TOP_TABS_FLATLIST_TUNING}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const active = String(dirTab) === item.key;
            const topTabTestId = DIRECTOR_TOP_TAB_TEST_IDS[index] ?? "unknown";
            return (
              <Pressable
                key={item.key}
                testID={`director-top-tab-${topTabTestId}`}
                onLayout={(e) => onTopTabLayout(item.key, e)}
                onPress={() => {
                  setDirTab(item.key);
                  if (item.key !== "Заявки") closeSheet();
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
              >
                <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "600", fontSize: 13 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={DIRECTOR_TOP_TABS_CONTENT_CONTAINER_STYLE}
        />

        {String(dirTab) === "Заявки" ? (
          <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2, minHeight: 44, justifyContent: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {(["foreman", "buyer"] as DirectorDashboardRequestTab[]).map((t) => {
                const active = tab === t;
                return (
                  <Pressable
                    key={t}
                    testID={`director-request-tab-${t}`}
                    onPress={() => setTab(t)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
                  >
                    <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "600", fontSize: 13 }}>
                      {t === "foreman" ? "Прораб" : "Снабженец"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      {String(dirTab) === "Заявки" ? (
        <Animated.View style={{ opacity: subOpacity }}>
          {tab === "foreman" ? (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Заявки</Text>
              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Заявок</Text>
                  <Text style={s.kpiValue}>{loadingRows && !foremanRequestsCount ? "..." : String(foremanRequestsCount)}</Text>
                </View>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>{loadingRows && !foremanPositionsCount ? "..." : String(foremanPositionsCount)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Предложения</Text>
              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Предложений</Text>
                  <Text style={s.kpiValue}>{loadingProps && !buyerPropsCount ? "..." : String(buyerPropsCount)}</Text>
                </View>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>{loadingProps && !buyerPositionsCount ? "..." : String(buyerPositionsCount)}</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
