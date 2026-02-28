// src/screens/director/DirectorDashboard.tsx
import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  Animated
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { UI, s } from "./director.styles";

type Tab = "foreman" | "buyer";
type DirTopTab = "Заявки" | "Подряды" | "Финансы" | "Склад" | "Отчёты";
import DirectorSubcontractTab from "./DirectorSubcontractTab";

type Group = { request_id: number | string; items: any[] };
type ProposalHead = { id: string; submitted_at?: string | null; pretty?: string | null };

// finance (оставляем “any”, чтобы не тащить 10 типов)
type FinanceRow = any;

type FinPage = "home" | "debt" | "spend" | "kind" | "supplier";

type Props = {
  HEADER_MAX: number;
  HEADER_MIN: number;
  onScroll: any;
  headerHeight: any;
  headerShadow: any;
  titleSize: any;
  subOpacity: any;

  headerTopInset?: number;
  onHeaderMeasured?: (h: number) => void;

  dirTab: DirTopTab;
  setDirTab: (t: DirTopTab) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  closeSheet: () => void;

  groups: Group[];
  propsHeads: ProposalHead[];
  loadingRows: boolean;
  loadingProps: boolean;

  foremanRequestsCount: number;
  foremanPositionsCount: number;
  buyerPropsCount: number;
  buyerPositionsCount: number;

  labelForRequest: (rid: any) => string;
  fmtDateOnly: (iso?: string | null) => string;
  submittedAtByReq: Record<string, string>;

  openRequestSheet: (g: Group) => void;
  ProposalRow: React.ComponentType<{ p: ProposalHead; screenLock: boolean }>;
  screenLock: boolean;

  ensureSignedIn: () => Promise<any>;
  fetchRows: () => Promise<any>;
  fetchProps: () => Promise<any>;
  rtToast: { visible: boolean; title: string; body: string; count: number };

  finLoading: boolean;
  finRows: FinanceRow[];
  finRep: any;
  finSpendRows: any[];
  money: (v: number) => string;
  FIN_DUE_DAYS_DEFAULT: number;
  FIN_CRITICAL_DAYS: number;

  fetchFinance: () => Promise<any>;
  finFrom?: string | null;
  finTo?: string | null;

  openFinancePage: (page: FinPage) => void;

  openReports?: () => void;
  reportsPeriodShort?: string;

};

export default function DirectorDashboard(p: Props) {
  const finRep = p.finRep;
  const sum = finRep?.summary;
  const rep = finRep?.report;

  const periodShort =
    p.finFrom || p.finTo
      ? `${p.finFrom ? p.fmtDateOnly(p.finFrom) : "—"} → ${p.finTo ? p.fmtDateOnly(p.finTo) : "—"}`
      : "Весь период";

  const headerTitle = "Контроль";
  const headerPadTop = Platform.OS === "web" ? 10 : 0;
  const contentTopPad = Math.max(p.HEADER_MAX + 12 + headerPadTop, p.HEADER_MIN + 12 + headerPadTop);

  const topTabsRef = React.useRef<FlatList<DirTopTab> | null>(null);
  const topTabXRef = React.useRef<Record<string, { x: number; w: number }>>({});

  const onTopTabLayout = React.useCallback((key: string, e: any) => {
    const x = Number(e?.nativeEvent?.layout?.x ?? 0);
    const w = Number(e?.nativeEvent?.layout?.width ?? 0);
    topTabXRef.current[key] = { x, w };
  }, []);

  React.useEffect(() => {
    const sv = topTabsRef.current as any;
    const rec = topTabXRef.current?.[p.dirTab];
    if (!sv || !rec) return;
    try {
      sv.scrollToOffset({ offset: Math.max(0, rec.x - 12), animated: true });
    } catch { }
  }, [p.dirTab]);

  const HeaderContent = (
    <View>
      <Animated.Text style={[s.collapsingTitle, { fontSize: p.titleSize }]} numberOfLines={1}>
        {headerTitle}
      </Animated.Text>

      {/* TOP tabs */}
      <FlatList
        ref={topTabsRef}
        data={(["Заявки", "Подряды", "Финансы", "Склад", "Отчёты"] as DirTopTab[])}
        keyExtractor={(t) => t}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: t }) => {
          const active = p.dirTab === t;
          return (
            <Pressable
              key={t}
              onLayout={(e) => onTopTabLayout(t, e)}
              onPress={() => {
                p.setDirTab(t);
                if (t !== "Заявки") p.closeSheet();
              }}
              style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
            >
              <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "800" }}>
                {t}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{
          paddingTop: 2,
          paddingBottom: 2,
          alignItems: "center",
          paddingRight: 12,
        }}
      />

      {/* SUB tabs */}
      {p.dirTab === "Заявки" ? (
        <View style={{ paddingTop: 6, paddingBottom: 2, minHeight: 44, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {(["foreman", "buyer"] as Tab[]).map((t) => {
              const active = p.tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => p.setTab(t)}
                  style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
                >
                  <Text numberOfLines={1} style={{ color: active ? UI.text : UI.sub, fontWeight: "800" }}>
                    {t === "foreman" ? "Прораб" : "Снабженец"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* KPI */}
      {p.dirTab === "Заявки" ? (
        <Animated.View style={{ opacity: p.subOpacity }}>
          {p.tab === "foreman" ? (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Заявки</Text>

              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Заявок</Text>
                  <Text style={s.kpiValue}>{p.loadingRows ? "…" : String(p.foremanRequestsCount)}</Text>
                </View>

                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>{p.loadingRows ? "…" : String(p.foremanPositionsCount)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Предложения</Text>

              <View style={s.kpiRow}>
                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Предложений</Text>
                  <Text style={s.kpiValue}>{p.loadingProps ? "…" : String(p.buyerPropsCount)}</Text>
                </View>

                <View style={s.kpiPillHalf}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>{p.loadingProps ? "…" : String(p.buyerPositionsCount)}</Text>
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

      {/* toast */}
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
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 13 }} numberOfLines={1}>
              {p.rtToast.title}
              {p.rtToast.count > 1 ? ` · x${p.rtToast.count}` : ""}
            </Text>

            {p.rtToast.body ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontWeight: "700",
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

      {/* BODY */}
      {p.dirTab === "Заявки" ? (
        <>
          {p.tab === "foreman" ? (
            <FlatList
              data={p.groups}
              keyExtractor={(g, idx) => (g?.request_id ? `req:${String(g.request_id)}` : `g:${idx}`)}
              removeClippedSubviews={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={null}
              renderItem={({ item }) => {
                const submittedAt = p.submittedAtByReq[String(item.request_id ?? "").trim()] ?? null;

                return (
                  <Pressable
                    onPress={() => p.openRequestSheet(item)}
                    style={[s.mobCard, { marginBottom: 10, marginHorizontal: 16 }]}
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
              }}
              ListEmptyComponent={
                !p.loadingRows ? (
                  <Text style={{ opacity: 0.6, padding: 16, color: UI.sub }}>Нет ожидающих позиций</Text>
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={p.loadingRows}
                  onRefresh={async () => {
                    if (p.loadingRows) return;
                    await p.ensureSignedIn();
                    await p.fetchRows();
                  }}
                  title=""
                  tintColor={UI.accent}
                />
              }
              onScroll={p.onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 24 }}
            />
          ) : (
            <FlatList
              data={p.propsHeads}
              keyExtractor={(x, idx) => (x?.id ? `pp:${x.id}` : `pp:${idx}`)}
              removeClippedSubviews={false}
              renderItem={({ item }) => <p.ProposalRow p={item} screenLock={p.screenLock} />}
              refreshControl={
                <RefreshControl
                  refreshing={p.loadingProps}
                  onRefresh={async () => {
                    if (p.loadingProps) return;
                    await p.ensureSignedIn();
                    await p.fetchProps();
                  }}
                  title=""
                  tintColor={UI.accent}
                />
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
      ) : p.dirTab === "Финансы" ? (
        <FlatList
          data={[{ key: "debt" }, { key: "spend" }]}
          keyExtractor={(x) => x.key}
          renderItem={({ item }) => {
            if (item.key === "debt") {
              return (
                <Pressable
                  onPress={() => p.openFinancePage("debt")}
                  style={[s.groupHeader, { marginHorizontal: 16, marginBottom: 12 }]}
                >
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
                    Обязательства
                  </Text>
                </Pressable>

              );
            }

            return (
              <Pressable
                onPress={() => p.openFinancePage("spend")}
                style={[s.groupHeader, { marginHorizontal: 16, marginBottom: 12 }]}
              >
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
                  Расходы
                </Text>
              </Pressable>

            );
          }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              {/* Можно позже сюда добавить маленькие KPI из p.finRep, но модалки больше НЕ рендерим */}
              {rep?.debtCount != null ? (
                <View style={[s.mobCard, { marginBottom: 10 }]}>
                  <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                    К оплате:{" "}
                    <Text style={{ color: UI.sub, fontWeight: "900" }}>
                      {p.money(rep?.debtAmount ?? 0)} KGS · {String(rep?.debtCount ?? 0)} сч.
                    </Text>
                  </Text>
                  {rep?.overdueCount ? (
                    <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }} numberOfLines={1}>
                      Требует оплаты: {String(rep?.overdueCount ?? 0)} · критично: {String(rep?.criticalCount ?? 0)}
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
      ) : p.dirTab === "Подряды" ? (
        <DirectorSubcontractTab
          contentTopPad={contentTopPad}
          onScroll={p.onScroll}
        />
      ) : p.dirTab === "Склад" ? (
        <View style={{ paddingTop: contentTopPad + 4, paddingHorizontal: 16 }}>
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Склад: позже сделаем сводку.</Text>
        </View>
      ) : (
        <View style={{ paddingTop: contentTopPad + 4, paddingHorizontal: 16 }}>
          {/* ✅ Отчёты: карточка отчёта */}
          <Pressable
            onPress={() => (p as any).openReports?.()}
            style={[s.mobCard, { marginBottom: 12 }]}
          >
            <View style={s.mobMain}>
              <Text style={s.mobTitle} numberOfLines={1}>
                Факт выдачи (склад)
              </Text>
              <Text style={s.mobMeta} numberOfLines={2}>
                {(p as any).reportsPeriodShort ? `Период: ${(p as any).reportsPeriodShort}` : "Период: 30 дней"}
              </Text>
            </View>

            <View style={{ marginLeft: 10 }}>
              <View style={[s.openBtn, { minWidth: 0, paddingVertical: 8, paddingHorizontal: 12 }]}>
                <Text style={[s.openBtnText, { fontSize: 12 }]}>Открыть</Text>
              </View>
            </View>
          </Pressable>

          <Text style={{ color: UI.sub, fontWeight: "800", opacity: 0.85 }}>
            Отчёт показывает факт выдачи со склада и дисциплину (без заявки/без объекта).
          </Text>
        </View>
      )}

    </View>
  );
}
