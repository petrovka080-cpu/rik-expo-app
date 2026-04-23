// src/screens/director/DirectorDashboard.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  Platform,
  Animated,
  type FlatList,
} from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { StatusBar } from "expo-status-bar";
import { UI, s } from "./director.styles";
import { officeRoleChrome } from "../office/officeRoleChrome";
import type { DirTopTab, FinPage, Group, ProposalHead } from "./director.types";
import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import DirectorSubcontractTab from "./DirectorSubcontractTab";
import { reportDirectorTopTabsScrollFailure } from "./director.observability";

type Tab = "foreman" | "buyer";
type TopTabItem = { key: DirTopTab; label: string };

type TopTabsListRef = { scrollToOffset?: (params: { offset: number; animated?: boolean }) => void };

const DIRECTOR_TOP_TABS: TopTabItem[] = [
  { key: "Заявки", label: "Заявки" },
  { key: "Подряды", label: "Подряды" },
  { key: "Финансы", label: "Финансы" },
  { key: "Склад", label: "Склад" },
  { key: "Отчёты", label: "Отчёты" },
];

type Props = {
  HEADER_MAX: number;
  HEADER_MIN: number;
  onScroll: (...args: unknown[]) => void;
  headerHeight: Animated.AnimatedInterpolation<number> | number;
  headerShadow: Animated.AnimatedInterpolation<number> | number;
  titleSize: Animated.AnimatedInterpolation<number> | number;
  subOpacity: Animated.AnimatedInterpolation<number> | number;
  headerTopInset?: number;
  onHeaderMeasured?: (h: number) => void;
  dirTab: DirTopTab;
  setDirTab: (t: DirTopTab) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  closeSheet: () => void;
  groups: Group[];
  propsHeads: ProposalHead[];
  propsHasMore: boolean;
  loadingPropsMore: boolean;
  loadingRows: boolean;
  loadingProps: boolean;
  foremanRequestsCount: number;
  foremanPositionsCount: number;
  buyerPropsCount: number;
  buyerPositionsCount: number;
  labelForRequest: (rid: number | string | null | undefined) => string;
  fmtDateOnly: (iso?: string | null) => string;
  submittedAtByReq: Record<string, string>;
  openRequestSheet: (g: Group) => void;
  ProposalRow: React.ComponentType<{ p: ProposalHead; screenLock: boolean }>;
  screenLock: boolean;
  ensureSignedIn: () => Promise<boolean>;
  fetchRows: (force?: boolean) => Promise<void>;
  fetchProps: (force?: boolean) => Promise<void>;
  loadMoreProps: () => Promise<void> | void;
  rtToast: { visible: boolean; title: string; body: string; count: number };
  finLoading: boolean;
  finScope: DirectorFinanceCanonicalScope | null;
  money: (v: number) => string;
  FIN_DUE_DAYS_DEFAULT: number;
  FIN_CRITICAL_DAYS: number;
  fetchFinance: () => Promise<void>;
  finFrom?: string | null;
  finTo?: string | null;
  openFinancePage: (page: FinPage) => void;
  openReports?: () => void;
  reportsPeriodShort?: string;
};

export default function DirectorDashboard(p: Props) {
  const finSummary = p.finScope?.summary;

  const headerTitle = "Контроль";
  const headerPadTop = Platform.OS === "web" ? 10 : 0;
  const contentTopPad = Math.max(p.HEADER_MAX + 16 + headerPadTop, p.HEADER_MIN + 16 + headerPadTop);

  const topTabsRef = React.useRef<FlatList<TopTabItem> | null>(null);
  const topTabXRef = React.useRef<Record<string, { x: number; w: number }>>({});

  const onTopTabLayout = React.useCallback((key: string, e: { nativeEvent?: { layout?: { x?: number; width?: number } } }) => {
    const x = Number(e?.nativeEvent?.layout?.x ?? 0);
    const w = Number(e?.nativeEvent?.layout?.width ?? 0);
    topTabXRef.current[key] = { x, w };
  }, []);

  React.useEffect(() => {
    const sv = topTabsRef.current as TopTabsListRef | null;
    const rec = topTabXRef.current?.[p.dirTab];
    if (!sv || !rec) return;
    if (typeof sv.scrollToOffset !== "function") return;
    try {
      sv.scrollToOffset({ offset: Math.max(0, rec.x - 12), animated: true });
    } catch (error) {
      reportDirectorTopTabsScrollFailure(error);
    }
  }, [p.dirTab]);

  const refreshRowsControl = React.useMemo(
    () => (
      <RefreshControl
        refreshing={p.loadingRows}
        onRefresh={async () => {
          if (p.loadingRows) return;
          await p.ensureSignedIn();
          await p.fetchRows(true);
        }}
        title=""
        tintColor={UI.accent}
      />
    ),
    [p],
  );

  const refreshPropsControl = React.useMemo(
    () => (
      <RefreshControl
        refreshing={p.loadingProps}
        onRefresh={async () => {
          if (p.loadingProps) return;
          await p.ensureSignedIn();
          await p.fetchProps(true);
        }}
        title=""
        tintColor={UI.accent}
      />
    ),
    [p],
  );

  const renderForemanGroup = React.useCallback(
    ({ item }: { item: Group }) => {
      const submittedAt = p.submittedAtByReq[String(item.request_id ?? "").trim()] ?? null;

      return (
        <Pressable
          onPress={() => p.openRequestSheet(item)}
          style={[s.mobCard, { marginBottom: 12, marginHorizontal: 16 }]}
        >
          <View style={s.mobMain}>
            <Text style={s.mobTitle} numberOfLines={1}>
              {p.labelForRequest(item.request_id)}
            </Text>
            <Text style={s.mobMeta} numberOfLines={2}>
              {p.fmtDateOnly(submittedAt)}
              {` · позиций ${item.items.length}`}
            </Text>
          </View>

          <View style={{ marginLeft: 10 }}>
            <View style={[s.openBtn, { minWidth: 0, paddingVertical: 8, paddingHorizontal: 12 }]}>
              <Text style={[s.openBtnText, { fontSize: 12 }]}>Открыть</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [p],
  );

  const renderProposalHead = React.useCallback(
    ({ item }: { item: ProposalHead }) => <p.ProposalRow p={item} screenLock={p.screenLock} />,
    [p],
  );

  const HeaderContent = (
    <View>
      <Animated.Text style={[s.collapsingTitle, { fontSize: p.titleSize }]} numberOfLines={1}>
        {headerTitle}
      </Animated.Text>

      <View style={[officeRoleChrome.switcherShell, { marginTop: 12 }]}>
        <FlashList
        ref={topTabsRef}
        data={DIRECTOR_TOP_TABS}
        keyExtractor={(item) => item.key}
        estimatedItemSize={112}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const active = String(p.dirTab) === item.key;
          return (
            <Pressable
              key={item.key}
              onLayout={(e) => onTopTabLayout(item.key, e)}
              onPress={() => {
                p.setDirTab(item.key);
                if (item.key !== "Заявки") p.closeSheet();
              }}
              style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
            >
              <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "600", fontSize: 13 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={[officeRoleChrome.switcherRow, {
          paddingTop: 2,
          paddingBottom: 2,
          alignItems: "center",
          paddingRight: 12,
        }]}
      />

      {String(p.dirTab) === "Заявки" ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2, minHeight: 44, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {(["foreman", "buyer"] as Tab[]).map((t) => {
              const active = p.tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => p.setTab(t)}
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

      {String(p.dirTab) === "Заявки" ? (
        <Animated.View style={{ opacity: p.subOpacity }}>
          {p.tab === "foreman" ? (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Заявки</Text>

              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Заявок</Text>
                  <Text style={s.kpiValue}>
                    {p.loadingRows && !p.foremanRequestsCount ? "..." : String(p.foremanRequestsCount)}
                  </Text>
                </View>

                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>
                    {p.loadingRows && !p.foremanPositionsCount ? "..." : String(p.foremanPositionsCount)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Предложения</Text>

              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Предложений</Text>
                  <Text style={s.kpiValue}>
                    {p.loadingProps && !p.buyerPropsCount ? "..." : String(p.buyerPropsCount)}
                  </Text>
                </View>

                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>
                    {p.loadingProps && !p.buyerPositionsCount ? "..." : String(p.buyerPositionsCount)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: UI.bg }]}>
      <StatusBar style="light" />

      {p.rtToast.visible ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: Platform.OS === "web" ? 12 : 46,
            left: 12,
            right: 12,
            zIndex: 99999,
          }}
        >
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: "rgba(16,24,38,0.96)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 18,
              elevation: 9,
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "600", fontSize: 13 }} numberOfLines={1}>
              {p.rtToast.title}
              {p.rtToast.count > 1 ? ` · x${p.rtToast.count}` : ""}
            </Text>

            {p.rtToast.body ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontWeight: "500",
                  fontSize: 12,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {p.rtToast.body}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Animated.View
        style={[
          s.collapsingHeader,
          {
            height: p.headerHeight,
            minHeight: p.HEADER_MIN + headerPadTop,
            shadowOpacity: p.headerShadow,
            elevation: 9999,
            zIndex: 9999,
            paddingTop: headerPadTop,
          },
        ]}
      >
        {HeaderContent}
      </Animated.View>

      {String(p.dirTab) === "Заявки" ? (
        <>
          {p.tab === "foreman" ? (
            <FlashList
              data={p.groups}
              keyExtractor={(g, idx) => (g?.request_id ? `req:${String(g.request_id)}` : `g:${idx}`)}
              estimatedItemSize={108}
              keyboardShouldPersistTaps="handled"
              renderItem={renderForemanGroup}
              ListEmptyComponent={
                !p.loadingRows ? (
                  <Text style={{ opacity: 0.6, padding: 16, color: UI.sub }}>Нет ожидающих позиций</Text>
                ) : null
              }
              refreshControl={refreshRowsControl}
              onScroll={p.onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 24 }}
            />
          ) : (
            <FlashList
              data={p.propsHeads}
              keyExtractor={(x, idx) => (x?.id ? `pp:${x.id}` : `pp:${idx}`)}
              estimatedItemSize={160}
              renderItem={renderProposalHead}
              refreshControl={refreshPropsControl}
              onEndReached={() => {
                if (p.loadingPropsMore || !p.propsHasMore) return;
                void p.loadMoreProps();
              }}
              onEndReachedThreshold={0.35}
              ListFooterComponent={
                p.loadingPropsMore ? (
                  <Text style={{ opacity: 0.7, paddingHorizontal: 16, paddingBottom: 12, color: UI.sub }}>
                    {"Загрузка..."}
                  </Text>
                ) : p.propsHasMore ? (
                  <Text style={{ opacity: 0.6, paddingHorizontal: 16, paddingBottom: 12, color: UI.sub }}>
                    {"Прокрутите для догрузки"}
                  </Text>
                ) : null
              }
              onScroll={p.onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingTop: contentTopPad,
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
            />
          )}
        </>
      ) : String(p.dirTab) === "Финансы" ? (
        <FlashList
          data={[{ key: "debt" }, { key: "spend" }]}
          keyExtractor={(x) => x.key}
          estimatedItemSize={132}
          getItemType={(item) => item.key}
          renderItem={({ item }) => {
            if (item.key === "debt") {
              return (
                <Pressable
                  onPress={() => p.openFinancePage("debt")}
                  style={[s.groupHeader, { marginHorizontal: 16, marginBottom: 12 }]}
                >
                  <Text style={{ color: UI.text, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                    Обязательства
                  </Text>
                  <Text style={{ color: UI.sub, fontWeight: "700", fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                    По предложениям и счетам. Долг считается отдельно по каждому предложению.
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                onPress={() => p.openFinancePage("spend")}
                style={[s.groupHeader, { marginHorizontal: 16, marginBottom: 12 }]}
              >
                <Text style={{ color: UI.text, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                  Расходы
                </Text>
                <Text style={{ color: UI.sub, fontWeight: "700", fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                  По аллокациям расходов. Этот блок не пересчитывает долг по предложениям.
                </Text>
              </Pressable>
            );
          }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <Text style={[s.mobMeta, { marginBottom: 10 }]} numberOfLines={2}>
                {`Режим: ${p.finScope?.mode === "canonical" ? "canonical_v3" : "fallback_legacy"} · Обязательства: invoice-level · Расходы: allocation-level`}
              </Text>
              {p.finScope?.uiExplainer ? (
                <>
                  <Text style={[s.mobMeta, { marginBottom: 8 }]} numberOfLines={3}>
                    {p.finScope.uiExplainer.differenceSummary}
                  </Text>
                  <Text style={[s.mobMeta, { marginBottom: 10 }]} numberOfLines={3}>
                    {p.finScope.uiExplainer.workSummary}
                  </Text>
                </>
              ) : null}
              {finSummary?.debtCount != null ? (
                <View style={[s.mobCard, { marginBottom: 12 }]}>
                  <Text style={{ color: UI.text, fontWeight: "600" }} numberOfLines={1}>
                    Долг по предложениям:{" "}
                    <Text style={{ color: UI.sub, fontWeight: "600" }}>
                      {p.money(finSummary.debtTotal ?? 0)} KGS · {String(finSummary.debtCount ?? 0)} сч.
                    </Text>
                  </Text>
                  {finSummary?.overdueCount ? (
                    <Text style={{ color: UI.sub, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>
                      Требует оплаты: {String(finSummary.overdueCount ?? 0)} · критично: {String(finSummary.criticalCount ?? 0)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          contentContainerStyle={{
            paddingTop: contentTopPad,
            paddingBottom: 24,
          }}
          onScroll={p.onScroll}
          scrollEventThrottle={16}
        />
      ) : String(p.dirTab) === "Подряды" ? (
        <DirectorSubcontractTab contentTopPad={contentTopPad} onScroll={p.onScroll} />
      ) : String(p.dirTab) === "Склад" ? (
        <View style={{ paddingTop: contentTopPad + 4, paddingHorizontal: 16 }}>
          <Text style={{ color: UI.sub, fontWeight: "600" }}>Склад: позже сделаем сводку.</Text>
        </View>
      ) : (
        <View style={{ paddingTop: contentTopPad + 4, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => p.openReports?.()}
            style={[s.mobCard, { marginBottom: 12 }]}
          >
            <View style={s.mobMain}>
              <Text style={s.mobTitle} numberOfLines={1}>
                Факт выдачи (склад)
              </Text>
              <Text style={s.mobMeta} numberOfLines={2}>
                {p.reportsPeriodShort
                  ? `Период: ${p.reportsPeriodShort}`
                  : "Период: 30 дней"}
              </Text>
            </View>

            <View style={{ marginLeft: 10 }}>
              <View style={[s.openBtn, { minWidth: 0, paddingVertical: 8, paddingHorizontal: 12 }]}>
                <Text style={[s.openBtnText, { fontSize: 12 }]}>Открыть</Text>
              </View>
            </View>
          </Pressable>

          <Text style={{ color: UI.sub, fontWeight: "600", opacity: 0.85 }}>
            Отчёт показывает факт подтверждённых выдач со склада и дисциплину без заявки и без объекта.
          </Text>
        </View>
      )}
    </View>
  );
}
