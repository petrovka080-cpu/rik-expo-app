import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopRightActionBar from "../../../ui/TopRightActionBar";
import { UI, s } from "../warehouse.styles";

type Props = {
  headerTopPad: number;

  onScroll?: any;
  scrollEventThrottle?: number;

  periodFrom: string;
  periodTo: string;

  repStock?: any[];
  repMov?: any[];

  reportsUi: {
    issuesByDay: Array<{
      day: string;
      items: any[];
    }>;
    openIssueDetails: (issueId: number) => void;
  };

  onOpenPeriod: () => void;
  onRefresh: () => void;

  onPdfRegister: () => void;
  onPdfMaterials: () => void;
  onPdfObjectWork: () => void;

  onPdfIssue: (issueId: number) => void;

  onPdfDayRegister?: (day: string) => void | Promise<void>;
  onPdfDayMaterials?: (day: string) => void | Promise<void>;
};

export default function WarehouseReportsTab(props: Props) {
  const {
    headerTopPad,
    periodFrom,
    periodTo,
    reportsUi,
    onOpenPeriod,
    onRefresh,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfIssue,
    onPdfDayRegister,
    onPdfDayMaterials,
  } = props;

  const insets = useSafeAreaInsets();

  const [activeDay, setActiveDay] = useState<{
    day: string;
    items: any[];
  } | null>(null);

  const headerIssueNo = useMemo(() => {
    const h0: any = activeDay?.items?.[0];
    const issueId = Number(h0?.issue_id);
    return h0?.issue_no ?? (Number.isFinite(issueId) ? `ISSUE-${issueId}` : "");
  }, [activeDay]);

  if (activeDay) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, minHeight: 0 }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 20,
              fontWeight: "900",
              color: UI.text,
            }}
          >
            {headerIssueNo || activeDay.day}
          </Text>

          <Pressable
            onPress={() => setActiveDay(null)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={UI.text} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Math.max(24, insets.bottom + 16),
          }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <View style={[s.sectionBox, { marginBottom: 12 }]}>
            <Text style={s.sectionBoxTitle}>ДЕНЬ</Text>

            <TopRightActionBar
              titleLeft={activeDay.day}
              actions={[
                {
                  key: "pdf_day_reg",
                  icon: "document-text-outline",
                  onPress: () => void onPdfDayRegister?.(activeDay.day),
                },
                {
                  key: "pdf_day_mat",
                  icon: "cube-outline",
                  onPress: () => void onPdfDayMaterials?.(activeDay.day),
                },
              ]}
              ui={{
                text: UI.text,
                sub: UI.sub,
                border: "rgba(255,255,255,0.14)",
                btnBg: "rgba(255,255,255,0.06)",
              }}
            />
          </View>

          {activeDay.items.map((h: any, idx: number) => {
            const issueId = Number(h.issue_id);
            const issueNo = h.issue_no ?? (Number.isFinite(issueId) ? `ISSUE-${issueId}` : "ISSUE-—");

            return (
              <Pressable
                key={`${activeDay.day}_${issueId || idx}_${idx}`}
                onPress={() => {
                  if (!Number.isFinite(issueId)) return;
                  void reportsUi.openIssueDetails(issueId);
                }}
                style={{ marginBottom: 12 }}
              >
                <View style={s.mobCard}>
                  <View style={s.mobMain}>
                    <Text style={s.mobTitle}>{issueNo}</Text>
                    {!!h?.obj_name && <Text style={s.mobMeta}>{String(h.obj_name)}</Text>}
                  </View>

                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (!Number.isFinite(issueId)) return;
                      void onPdfIssue(issueId);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={20} color={UI.text} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerTopPad,
          paddingBottom: Math.max(16, insets.bottom + 12),
        }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.sectionBox, { paddingHorizontal: 16 }]}>
          <Text style={s.sectionBoxTitle}>ПЕРИОД ОТЧЕТА</Text>

          <TopRightActionBar
            titleLeft={
              periodFrom || periodTo
                ? `${periodFrom || "—"} → ${periodTo || "—"}`
                : "Весь период"
            }
            actions={[
              { key: "period", icon: "calendar-outline", onPress: onOpenPeriod },
              { key: "refresh", icon: "refresh-outline", onPress: () => void onRefresh() },
              { key: "pdf", icon: "document-text-outline", onPress: () => void onPdfRegister() },
              { key: "mat", icon: "cube-outline", onPress: () => void onPdfMaterials() },
              { key: "obj", icon: "business-outline", onPress: () => void onPdfObjectWork() },
            ]}
            ui={{
              text: UI.text,
              sub: UI.sub,
              border: "rgba(255,255,255,0.14)",
              btnBg: "rgba(255,255,255,0.06)",
            }}
          />
        </View>

        <View style={[s.sectionBox, { paddingHorizontal: 16 }]}>
          <Text style={s.sectionBoxTitle}>ВЫДАЧИ ЗА ПЕРИОД</Text>

          {reportsUi.issuesByDay.map((g) => {
            const dayCount = g.items.length;

            return (
              <Pressable key={g.day} onPress={() => setActiveDay(g)} style={{ marginBottom: 14 }}>
                <View style={s.mobCard}>
                  <View style={s.mobMain}>
                    <Text style={s.mobTitle}>{g.day}</Text>
                    <Text style={s.mobMeta}>Документов: {dayCount}</Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    <Pressable
                      hitSlop={10}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void onPdfDayRegister?.(g.day);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={20} color={UI.text} />
                    </Pressable>

                    <Pressable
                      hitSlop={10}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void onPdfDayMaterials?.(g.day);
                      }}
                    >
                      <Ionicons name="cube-outline" size={20} color={UI.text} />
                    </Pressable>

                    <Ionicons name="chevron-forward" size={20} color={UI.text} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}
