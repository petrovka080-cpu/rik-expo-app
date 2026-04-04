import React, { useMemo, useState } from "react";
import { ActivityIndicator, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopRightActionBar from "../../../ui/TopRightActionBar";
import SectionBlock from "../../../ui/SectionBlock";
import { StatusBadge } from "../../../ui/StatusBadge";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { FlashList } from "../../../ui/FlashList";
import type { TopRightAction } from "../../../ui/TopRightActionBar";
import { UI, s } from "../warehouse.styles";
import { buildWarehousePdfBusyKey } from "../warehouse.pdf.boundary";
import type { WarehouseReportRow } from "../warehouse.types";

type ReportDocRow = WarehouseReportRow & {
  incoming_id?: string | number | null;
  id?: string | number | null;
  issue_id?: string | number | null;
  display_no?: string | null;
  issue_no?: string | null;
  who?: string | null;
  obj_name?: string | null;
};

type ReportDayGroup = {
  day: string;
  items: ReportDocRow[];
};

type ReportsUi = {
  incomingByDay: ReportDayGroup[];
  vydachaByDay: ReportDayGroup[];
  openIncomingDetails: (incomingId: string | number) => void | Promise<void>;
  openIssueDetails: (issueId: string | number) => void | Promise<void>;
};

type Props = {
  headerTopPad: number;

  mode: "choice" | "issue" | "incoming";
  onBack: () => void;
  onSelectMode: (m: "issue" | "incoming") => void;

  onScroll?: ((...args: unknown[]) => void) | undefined;
  scrollEventThrottle?: number;

  periodFrom: string;
  periodTo: string;

  repStock?: WarehouseReportRow[];
  repMov?: WarehouseReportRow[];

  reportsUi: ReportsUi;

  onOpenPeriod: () => void;
  onRefresh: () => void;

  onPdfRegister: () => void;
  onPdfMaterials: () => void;
  onPdfObjectWork: () => void;

  onPdfDocument: (id: string | number) => void;

  onPdfDayRegister?: (day: string) => void | Promise<void>;
  onPdfDayMaterials?: (day: string) => void | Promise<void>;
  isPdfBusy: (key: string) => boolean;
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
    isPdfBusy,
  } = props;

  const insets = useSafeAreaInsets();

  const [activeDay, setActiveDay] = useState<ReportDayGroup | null>(null);

  const isIncoming = mode === "incoming";
  const dayGroups = isIncoming ? reportsUi.incomingByDay : reportsUi.vydachaByDay;
  const registerPdfBusy = isPdfBusy(
    buildWarehousePdfBusyKey({
      kind: "register",
      reportsMode: isIncoming ? "incoming" : "issue",
      periodFrom,
      periodTo,
    }),
  );
  const materialsPdfBusy = isPdfBusy(
    buildWarehousePdfBusyKey({
      kind: "materials",
      reportsMode: isIncoming ? "incoming" : "issue",
      periodFrom,
      periodTo,
    }),
  );
  const objectWorkPdfBusy =
    !isIncoming &&
    isPdfBusy(
      buildWarehousePdfBusyKey({
        kind: "object-work",
        periodFrom,
        periodTo,
      }),
    );
  const reportActions: TopRightAction[] = useMemo(() => {
    const actions: TopRightAction[] = [
      { key: "period", icon: "calendar-outline", onPress: onOpenPeriod },
      { key: "refresh", icon: "refresh-outline", onPress: () => void onRefresh() },
      {
        key: "pdf",
        icon: "document-text-outline",
        onPress: () => void onPdfRegister(),
        disabled: registerPdfBusy,
        busy: registerPdfBusy,
      },
      {
        key: "mat",
        icon: "cube-outline",
        onPress: () => void onPdfMaterials(),
        disabled: materialsPdfBusy,
        busy: materialsPdfBusy,
      },
    ];
    if (!isIncoming) {
      actions.push({
        key: "obj",
        icon: "business-outline",
        onPress: () => void onPdfObjectWork(),
        disabled: objectWorkPdfBusy,
        busy: objectWorkPdfBusy,
      });
    }
    return actions;
  }, [
    isIncoming,
    materialsPdfBusy,
    objectWorkPdfBusy,
    onOpenPeriod,
    onRefresh,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfRegister,
    registerPdfBusy,
  ]);

  const sectionTitle = isIncoming ? "ПРИХОДЫ ЗА ПЕРИОД" : "ВЫДАЧИ ЗА ПЕРИОД";

  const renderActiveDayItem = React.useCallback(({ item, index }: { item: ReportDocRow; index: number }) => {
    const docId = isIncoming ? (item.incoming_id || item.id) : item.issue_id;
    const documentPdfBusy =
      !!docId &&
      isPdfBusy(
        buildWarehousePdfBusyKey({
          kind: "document",
          reportsMode: isIncoming ? "incoming" : "issue",
          docId,
        }),
      );
    const docNo = isIncoming
      ? (item.display_no || `PR-${String(docId).slice(0, 8)}`)
      : (item.issue_no || (Number.isFinite(docId) ? `ISSUE-${docId}` : "ISSUE-—"));

    return (
      <View style={{ marginBottom: 12 }}>
        <Pressable
          onPress={() => {
            if (!docId) return;
            if (isIncoming) {
              void reportsUi.openIncomingDetails(docId);
            } else {
              void reportsUi.openIssueDetails(docId);
            }
          }}
        >
          <View style={s.mobCard}>
            <View style={s.mobMain}>
              <Text style={s.mobTitle}>{docNo}</Text>
              {!!item?.who && <Text style={s.mobMeta}>{String(item.who)}</Text>}
              {!!item?.obj_name && <Text style={s.mobMeta}>{String(item.obj_name)}</Text>}
            </View>

            <Pressable
              testID={`warehouse-report-pdf:${String(docId ?? index)}`}
              hitSlop={10}
              disabled={!docId || documentPdfBusy}
              onPress={(e) => {
                e.stopPropagation?.();
                if (!docId || documentPdfBusy) return;
                void onPdfDocument(docId);
              }}
              accessibilityState={{ disabled: !docId || documentPdfBusy, busy: documentPdfBusy }}
            >
              {documentPdfBusy ? (
                <ActivityIndicator size="small" color={UI.text} />
              ) : (
                <Ionicons name="document-text-outline" size={20} color={UI.text} />
              )}
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }, [isIncoming, isPdfBusy, onPdfDocument, reportsUi]);

  const renderDayGroupItem = React.useCallback(({ item }: { item: ReportDayGroup }) => {
    const dayCount = item.items.length;

    return (
      <Pressable
        testID={`warehouse-report-day:${item.day}`}
        accessibilityLabel={`warehouse-report-day:${item.day}`}
        accessible
        onPress={() => setActiveDay(item)}
        style={{ marginBottom: 12, marginHorizontal: 16 }}
      >
        <View style={s.mobCard}>
          <View style={s.mobMain}>
            <Text style={s.mobTitle}>{item.day}</Text>
            <Text style={s.mobMeta}>Документов: {dayCount}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <StatusBadge label={`${dayCount}`} tone="info" compact />
            <ChevronIndicator />
          </View>
        </View>
      </Pressable>
    );
  }, []);

  const dayRegisterBusy =
    !!activeDay &&
    isPdfBusy(
      buildWarehousePdfBusyKey({
        kind: "day-register",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: activeDay.day,
      }),
    );
  const dayMaterialsBusy =
    !!activeDay &&
    isPdfBusy(
      buildWarehousePdfBusyKey({
        kind: "day-materials",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: activeDay.day,
      }),
    );

  const reportsListHeader = React.useMemo(() => (
    <>
      <View style={{ paddingHorizontal: 16, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
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
        <Text style={{ color: UI.text, fontSize: 18, fontWeight: "600" }}>
          {isIncoming ? "ПРИХОД" : "ВЫДАЧИ"}
        </Text>
      </View>

      <SectionBlock title="ПЕРИОД ОТЧЁТА" style={[s.sectionBox, { paddingHorizontal: 16 }]} contentStyle={{ gap: 0 }}>
        <TopRightActionBar
          titleLeft={
            periodFrom || periodTo
              ? `${periodFrom || "—"} → ${periodTo || "—"}`
              : "Весь период"
          }
          actions={reportActions}
          ui={{
            text: UI.text,
            sub: UI.sub,
            border: "rgba(255,255,255,0.14)",
            btnBg: "rgba(255,255,255,0.06)",
          }}
        />
      </SectionBlock>

      <SectionBlock title={sectionTitle} style={[s.sectionBox, { paddingHorizontal: 16 }]} contentStyle={{ gap: 0 }}>
        <View />
      </SectionBlock>
    </>
  ), [isIncoming, onBack, periodFrom, periodTo, reportActions, sectionTitle]);

  if (mode === "choice") {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: headerTopPad + 20 }}>
        <Text style={{ color: UI.text, fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 28 }}>
          ОТЧЁТЫ
        </Text>

        <View style={{ gap: 12 }}>
          <Pressable
            testID="warehouse-reports-mode-issue"
            accessibilityLabel="warehouse-reports-mode-issue"
            accessible
            onPress={() => onSelectMode("issue")}
            style={({ pressed }) => [
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 16,
                paddingVertical: 20,
                alignItems: "center",
              },
              pressed && { opacity: 0.9, backgroundColor: "rgba(255,255,255,0.08)" },
            ]}
          >
            <Text style={{ color: UI.text, fontSize: 17, fontWeight: "600" }}>Выдача</Text>
          </Pressable>

          <Pressable
            testID="warehouse-reports-mode-incoming"
            accessibilityLabel="warehouse-reports-mode-incoming"
            accessible
            onPress={() => onSelectMode("incoming")}
            style={({ pressed }) => [
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 16,
                paddingVertical: 20,
                alignItems: "center",
              },
              pressed && { opacity: 0.9, backgroundColor: "rgba(255,255,255,0.08)" },
            ]}
          >
            <Text style={{ color: UI.text, fontSize: 17, fontWeight: "600" }}>Приход</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
            testID="warehouse-day-back"
            accessibilityLabel="warehouse-day-back"
            accessible
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
              fontWeight: "600",
              color: UI.text,
            }}
          >
            {activeDay.day}
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              testID="warehouse-day-register-pdf"
              accessibilityLabel="warehouse-day-register-pdf"
              accessible
              onPress={() => {
                if (dayRegisterBusy) return;
                void onPdfDayRegister?.(activeDay.day);
              }}
              disabled={dayRegisterBusy}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                opacity: dayRegisterBusy ? 0.55 : 1,
              }}
              hitSlop={10}
              accessibilityState={{ disabled: dayRegisterBusy, busy: dayRegisterBusy }}
            >
              {dayRegisterBusy ? (
                <ActivityIndicator size="small" color={UI.text} />
              ) : (
                <Ionicons name="document-text-outline" size={18} color={UI.text} />
              )}
            </Pressable>

            <Pressable
              testID="warehouse-day-materials-pdf"
              accessibilityLabel="warehouse-day-materials-pdf"
              accessible
              onPress={() => {
                if (dayMaterialsBusy) return;
                void onPdfDayMaterials?.(activeDay.day);
              }}
              disabled={dayMaterialsBusy}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                opacity: dayMaterialsBusy ? 0.55 : 1,
              }}
              hitSlop={10}
              accessibilityState={{ disabled: dayMaterialsBusy, busy: dayMaterialsBusy }}
            >
              {dayMaterialsBusy ? (
                <ActivityIndicator size="small" color={UI.text} />
              ) : (
                <Ionicons name="cube-outline" size={18} color={UI.text} />
              )}
            </Pressable>
          </View>
        </View>

        <FlashList
          data={activeDay.items}
          renderItem={renderActiveDayItem}
          keyExtractor={(item, index) => {
            const docId = isIncoming ? (item.incoming_id || item.id) : item.issue_id;
            return `${activeDay.day}_${docId || index}_${index}`;
          }}
          style={{ flex: 1 }}
          estimatedItemSize={92}
          contentContainerStyle={{
            paddingTop: 20,
            paddingHorizontal: 16,
            paddingBottom: Math.max(24, insets.bottom + 20),
          }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
        />
      </View>
    );
  }

  return (
    <RoleScreenLayout>
      <FlashList
        data={dayGroups}
        renderItem={renderDayGroupItem}
        keyExtractor={(item) => item.day}
        style={{ flex: 1 }}
        estimatedItemSize={88}
        contentContainerStyle={{
          paddingTop: headerTopPad + 4,
          paddingBottom: Math.max(20, insets.bottom + 16),
        }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={reportsListHeader}
        ListFooterComponent={<View style={{ height: 8 }} />}
      />
    </RoleScreenLayout>
  );
}
