import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopRightActionBar from "../../../ui/TopRightActionBar";
import { UI, s } from "../warehouse.styles";

type Props = {
  headerTopPad: number;

  mode: "choice" | "issue" | "incoming";
  onBack: () => void;
  onSelectMode: (m: "issue" | "incoming") => void;

  onScroll?: any;
  scrollEventThrottle?: number;

  periodFrom: string;
  periodTo: string;

  repStock?: any[];
  repMov?: any[];

  reportsUi: any;


  onOpenPeriod: () => void;
  onRefresh: () => void;

  onPdfRegister: () => void;
  onPdfMaterials: () => void;
  onPdfObjectWork: () => void;

  onPdfDocument: (id: string | number) => void;

  onPdfDayRegister?: (day: string) => void | Promise<void>;

  onPdfDayMaterials?: (day: string) => void | Promise<void>;
};

export default function WarehouseReportsTab(props: Props) {
  const {
    headerTopPad,
    mode,
    onBack,
    onSelectMode,
    periodFrom,
    periodTo,
    reportsUi,
    onOpenPeriod,
    onRefresh,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDocument,
    onPdfDayRegister,
    onPdfDayMaterials,
  } = props;

  const insets = useSafeAreaInsets();

  const [activeDay, setActiveDay] = useState<{
    day: string;
    items: any[];
  } | null>(null);

  if (mode === "choice") {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: headerTopPad + 20 }}>
        <Text style={{ color: UI.text, fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 40 }}>
          ОТЧЁТЫ
        </Text>

        <View style={{ gap: 16 }}>
          <Pressable
            onPress={() => onSelectMode("issue")}
            style={({ pressed }) => [
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 16,
                paddingVertical: 24,
                alignItems: "center",
              },
              pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.1)" },
            ]}
          >
            <Text style={{ color: UI.text, fontSize: 20, fontWeight: "800" }}>[ Выдача ]</Text>
          </Pressable>

          <Pressable
            onPress={() => onSelectMode("incoming")}
            style={({ pressed }) => [
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 16,
                paddingVertical: 24,
                alignItems: "center",
              },
              pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.1)" },
            ]}
          >
            <Text style={{ color: UI.text, fontSize: 20, fontWeight: "800" }}>[ Приход ]</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isIncoming = mode === "incoming";
  const sectionTitle = isIncoming ? "ПРИХОДЫ ЗА ПЕРИОД" : "ВЫДАЧИ ЗА ПЕРИОД";

  if (activeDay) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, minHeight: 0 }}>
        <View
          style={{
            paddingTop: headerTopPad + 4,
            paddingHorizontal: 16,
            paddingBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
            backgroundColor: UI.bg,
          }}
        >
          <Pressable
            onPress={() => setActiveDay(null)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
            hitSlop={15}
          >
            <Ionicons name="chevron-back" size={24} color={UI.text} />
          </Pressable>

          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "900",
              color: UI.text,
            }}
          >
            {activeDay.day}
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => onPdfDayRegister?.(activeDay.day)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
              hitSlop={10}
            >
              <Ionicons name="document-text-outline" size={18} color={UI.text} />
            </Pressable>

            <Pressable
              onPress={() => onPdfDayMaterials?.(activeDay.day)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
              hitSlop={10}
            >
              <Ionicons name="cube-outline" size={18} color={UI.text} />
            </Pressable>

          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: Math.max(24, insets.bottom + 16),
          }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {activeDay.items.map((h: any, idx: number) => {
            const docId = isIncoming ? (h.incoming_id || h.id) : h.issue_id;
            const docNo = isIncoming
              ? (h.display_no || `PR-${String(docId).slice(0, 8)}`)
              : (h.issue_no || (Number.isFinite(docId) ? `ISSUE-${docId}` : "ISSUE-—"));

            return (
              <View key={`${activeDay.day}_${docId || idx}_${idx}`} style={{ marginBottom: 12 }}>
                <Pressable
                  onPress={() => {
                    if (!docId) return;
                    if (isIncoming) {
                      void (reportsUi as any).openIncomingDetails(docId);
                    } else {
                      void reportsUi.openIssueDetails(docId);
                    }
                  }}
                >
                  <View style={s.mobCard}>
                    <View style={s.mobMain}>
                      <Text style={s.mobTitle}>{docNo}</Text>
                      {!!h?.who && <Text style={s.mobMeta}>{String(h.who)}</Text>}
                      {!!h?.obj_name && <Text style={s.mobMeta}>{String(h.obj_name)}</Text>}
                    </View>

                    <Pressable
                      hitSlop={10}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (!docId) return;
                        void onPdfDocument(docId);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={20} color={UI.text} />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
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
        <View style={{ paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={onBack}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
            hitSlop={15}
          >
            <Ionicons name="close" size={22} color={UI.text} />
          </Pressable>
          <Text style={{ color: UI.text, fontSize: 18, fontWeight: '900' }}>
            {isIncoming ? "ПРИХОД" : "ВЫДАЧА"}
          </Text>
        </View>

        <View style={[s.sectionBox, { paddingHorizontal: 16 }]}>
          <Text style={s.sectionBoxTitle}>ПЕРИОД ОТЧЕТА</Text>

          <TopRightActionBar
            titleLeft={
              periodFrom || periodTo
                ? `${periodFrom || "—"} → ${periodTo || "—"}`
                : "Весь период"
            }
            actions={[
              { key: "period", icon: "calendar-outline" as any, onPress: onOpenPeriod },
              { key: "refresh", icon: "refresh-outline" as any, onPress: () => void onRefresh() },
              { key: "pdf", icon: "document-text-outline" as any, onPress: () => void onPdfRegister() },
              { key: "mat", icon: "cube-outline" as any, onPress: () => void onPdfMaterials() },
              ...(!isIncoming ? [
                { key: "obj", icon: "business-outline" as any, onPress: () => void onPdfObjectWork() },
              ] : []),
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
          <Text style={s.sectionBoxTitle}>{sectionTitle}</Text>

          {(isIncoming ? reportsUi.incomingByDay : reportsUi.vydachaByDay).map((g) => {
            const dayCount = g.items.length;

            return (
              <Pressable key={g.day} onPress={() => setActiveDay(g)} style={{ marginBottom: 14 }}>
                <View style={s.mobCard}>
                  <View style={s.mobMain}>
                    <Text style={s.mobTitle}>{g.day}</Text>
                    <Text style={s.mobMeta}>Документов: {dayCount}</Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
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
