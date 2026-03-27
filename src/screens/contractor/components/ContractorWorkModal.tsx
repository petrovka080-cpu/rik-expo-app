import React from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { WorkLogRow, LinkedReqCard, IssuedItemRow } from "../types";
import WorkModalOverviewSection from "./WorkModalOverviewSection";
import ActsHistorySection from "./ActsHistorySection";
import IssuedSection from "./IssuedSection";
import ModalSheetHeader from "./ModalSheetHeader";

type WorkRowLite = {
  work_name: string | null;
  work_code: string | null;
  uom_id: string | null;
};

type JobHeaderLite = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  contractor_rep?: string | null;
  zone?: string | null;
  level_name?: string | null;
  unit_price?: number | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  modalHeaderTopPad: number;
  workModalRow: WorkRowLite | null;
  workModalLoading: boolean;
  resolvedObjectName: string;
  resolvedObjectInfo: string;
  jobHeader: JobHeaderLite | null;
  workModalSaving: boolean;
  loadingIssued: boolean;
  workModalHint: string;
  progressSyncLabel: string;
  progressSyncDetail: string | null;
  progressSyncTone: "neutral" | "info" | "success" | "warning" | "danger";
  canSubmitProgress: boolean;
  canRetryProgress: boolean;
  onSubmitProgress: () => void;
  onRetryProgress: () => void;
  onOpenContract: () => void;
  onOpenActBuilder: () => void;
  onOpenSummaryPdf: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  workLog: WorkLogRow[];
  onOpenHistoryPdf: (log: WorkLogRow) => void;
  getVisibleNote: (note: string | null | undefined) => string;
  issuedOpen: boolean;
  onToggleIssued: () => void;
  linkedReqCards: LinkedReqCard[];
  issuedItems: IssuedItemRow[];
  issuedHint: string;
  onOpenEstimate: () => void;
  styles: any;
};

type WebModalStyle = Omit<ViewStyle, "position"> & {
  position?: "absolute" | "relative" | "fixed";
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  zIndex?: number;
  backgroundColor?: string;
};

const asWebStyle = (style: WebModalStyle): ViewStyle => style as ViewStyle;

export default function ContractorWorkModal(props: Props) {
  const content = (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <ModalSheetHeader
        title="Факт выполнения работы"
        onClose={props.onClose}
        containerStyle={{
          paddingHorizontal: 16,
          paddingTop: props.modalHeaderTopPad,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderColor: "#e2e8f0",
          backgroundColor: "#f8fafc",
        }}
        titleStyle={{ fontSize: 18, fontWeight: "800" }}
        closeBtnStyle={{
          width: 34,
          height: 34,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
        closeTextStyle={{ color: "#334155", fontWeight: "800", fontSize: 18, lineHeight: 20 }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
      >
        {props.workModalRow ? (
          <>
            {props.workModalLoading ? (
              <Text
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  marginBottom: 8,
                  marginTop: 6,
                }}
              >
                Загрузка истории и материалов...
              </Text>
            ) : null}

            <WorkModalOverviewSection
              workName={props.workModalRow.work_name || ""}
              workCode={props.workModalRow.work_code || ""}
              resolvedObjectName={props.resolvedObjectName}
              resolvedObjectInfo={props.resolvedObjectInfo}
              contractorOrg={props.jobHeader?.contractor_org || "—"}
              contractorInn={props.jobHeader?.contractor_inn || "—"}
              contractorPhone={props.jobHeader?.contractor_phone || "—"}
              contractNumber={props.jobHeader?.contract_number || "—"}
              contractDate={String(props.jobHeader?.contract_date || "").trim()}
              contractorRep={props.jobHeader?.contractor_rep || "—"}
              zone={props.jobHeader?.zone || "—"}
              levelName={props.jobHeader?.level_name || "—"}
              unitPrice={String(props.jobHeader?.unit_price ?? "—")}
              workModalSaving={props.workModalSaving}
              loadingIssued={props.loadingIssued}
              workModalHint={props.workModalHint}
              progressSyncLabel={props.progressSyncLabel}
              progressSyncDetail={props.progressSyncDetail}
              progressSyncTone={props.progressSyncTone}
              canSubmitProgress={props.canSubmitProgress}
              canRetryProgress={props.canRetryProgress}
              onSubmitProgress={props.onSubmitProgress}
              onRetryProgress={props.onRetryProgress}
              onOpenContract={props.onOpenContract}
              onOpenActBuilder={props.onOpenActBuilder}
              onOpenSummaryPdf={props.onOpenSummaryPdf}
              styles={props.styles}
            />

            <ActsHistorySection
              historyOpen={props.historyOpen}
              onToggle={props.onToggleHistory}
              workLog={props.workLog}
              fallbackUom={props.workModalRow.uom_id || ""}
              onOpenPdf={props.onOpenHistoryPdf}
              getVisibleNote={props.getVisibleNote}
              styles={props.styles}
            />

            <IssuedSection
              issuedOpen={props.issuedOpen}
              onToggle={props.onToggleIssued}
              loadingIssued={props.loadingIssued}
              linkedReqCards={props.linkedReqCards}
              issuedItems={props.issuedItems}
              issuedHint={props.issuedHint}
              styles={props.styles}
            />

            <Pressable
              onPress={props.onOpenEstimate}
              style={[props.styles.workModalSectionBtn, props.styles.workModalSectionBtnTop12]}
            >
              <Text style={props.styles.workModalSectionTitle}>Материалы / сопутствующие позиции</Text>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </Pressable>

            <View style={{ height: 24 }} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );

  if (Platform.OS === "web") {
    if (!props.visible) return null;
    return (
      <View
        style={asWebStyle({
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 9999,
        })}
        pointerEvents="auto"
      >
        <Pressable
          onPress={props.onClose}
          style={asWebStyle({
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
          })}
        />

        <View
          style={asWebStyle({
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            minHeight: 0,
            overflow: "hidden",
          })}
        >
          {content}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} onDismiss={props.onDismiss}>
      {content}
    </Modal>
  );
}
