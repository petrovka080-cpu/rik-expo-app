import React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ActBuilderItem, ActBuilderWorkItem } from "../types";
import ModalSheetHeader from "./ModalSheetHeader";
import ActBuilderHeaderInfo from "./ActBuilderHeaderInfo";
import ActBuilderWorksList from "./ActBuilderWorksList";
import ActBuilderMaterialsList from "./ActBuilderMaterialsList";
import ActBuilderTotalsCard from "./ActBuilderTotalsCard";
import ActBuilderFooter from "./ActBuilderFooter";

type JobHeader = {
  contract_number?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
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
  jobHeader: JobHeader | null;
  resolvedObjectName: string;
  actBuilderDateText: string;
  selectedWorkCount: number;
  selectedMatCount: number;
  actBuilderMatSum: number;
  actBuilderWorkSum: number;
  works: ActBuilderWorkItem[];
  items: ActBuilderItem[];
  expandedWorkId: string | null;
  expandedMatId: string | null;
  onToggleExpandedWork: (id: string) => void;
  onToggleExpandedMat: (id: string) => void;
  onToggleIncludeWork: (idx: number) => void;
  onQtyChangeWork: (idx: number, txt: string) => void;
  onUnitChangeWork: (idx: number, txt: string) => void;
  onPriceChangeWork: (idx: number, txt: string) => void;
  onToggleIncludeMat: (idx: number) => void;
  onDecrementMat: (idx: number) => void;
  onIncrementMat: (idx: number) => void;
  onPriceChangeMat: (idx: number, txt: string) => void;
  saving: boolean;
  hint: string;
  hasSelected: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
};

export default function ActBuilderModal(props: Props) {
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      onRequestClose={props.onClose}
      onDismiss={props.onDismiss}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
        <ModalSheetHeader
          title="Формирование акта"
          subtitle={`${props.jobHeader?.contract_number || "—"} • ${props.resolvedObjectName || "—"} • ${props.actBuilderDateText}`}
          onClose={props.onClose}
          containerStyle={{
            paddingHorizontal: 16,
            paddingTop: props.modalHeaderTopPad,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "#fff",
          }}
          titleStyle={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}
          subtitleStyle={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}
          closeBtnStyle={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#f1f5f9",
            alignItems: "center",
            justifyContent: "center",
          }}
          closeTextStyle={{ color: "#64748b", fontWeight: "800", fontSize: 20 }}
        />

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: 16, gap: 16 }}>
            <ActBuilderHeaderInfo
              jobHeader={props.jobHeader}
              resolvedObjectName={props.resolvedObjectName}
              selectedWorkCount={props.selectedWorkCount}
              selectedMatCount={props.selectedMatCount}
              matSum={props.actBuilderMatSum}
              actDateText={props.actBuilderDateText}
            />
            <ActBuilderWorksList
              works={props.works}
              expandedWorkId={props.expandedWorkId}
              resolvedObjectName={props.resolvedObjectName}
              onToggleExpanded={props.onToggleExpandedWork}
              onToggleInclude={props.onToggleIncludeWork}
              onQtyChange={props.onQtyChangeWork}
              onUnitChange={props.onUnitChangeWork}
              onPriceChange={props.onPriceChangeWork}
            />
            <Text style={{ color: "#334155", fontSize: 12, marginBottom: 4 }}>
              Работ с выбором: {props.selectedWorkCount}
            </Text>
            <Text style={{ color: "#334155", fontSize: 12, marginBottom: 8 }}>
              Материалов с выбором: {props.selectedMatCount}
            </Text>
            <Text style={{ fontWeight: "700", color: "#334155", marginBottom: 8 }}>Материалы по складу</Text>

            <ActBuilderMaterialsList
              items={props.items}
              expandedMatId={props.expandedMatId}
              onToggleExpanded={props.onToggleExpandedMat}
              onToggleInclude={props.onToggleIncludeMat}
              onDecrement={props.onDecrementMat}
              onIncrement={props.onIncrementMat}
              onPriceChange={props.onPriceChangeMat}
            />
            <ActBuilderTotalsCard workSum={props.actBuilderWorkSum} matSum={props.actBuilderMatSum} />
          </View>
        </ScrollView>

        <ActBuilderFooter
          saving={props.saving}
          hint={props.hint}
          hasSelected={props.hasSelected}
          canSubmit={props.canSubmit}
          onSubmit={props.onSubmit}
        />
      </SafeAreaView>
    </Modal>
  );
}
