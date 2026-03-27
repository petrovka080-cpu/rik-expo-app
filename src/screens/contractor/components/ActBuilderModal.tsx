import React from "react";
import { Modal, Text, View, type ListRenderItemInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ActBuilderItem, ActBuilderWorkItem } from "../types";
import ModalSheetHeader from "./ModalSheetHeader";
import ActBuilderHeaderInfo from "./ActBuilderHeaderInfo";
import ActBuilderTotalsCard from "./ActBuilderTotalsCard";
import ActBuilderFooter from "./ActBuilderFooter";
import ActBuilderWorkRow from "./ActBuilderWorkRow";
import ActBuilderMaterialRow from "./ActBuilderMaterialRow";
import { FlashList } from "../../../ui/FlashList";

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

type ActBuilderListEntry =
  | { key: string; kind: "work"; item: ActBuilderWorkItem; index: number }
  | { key: string; kind: "works_empty" }
  | { key: string; kind: "counts" }
  | { key: string; kind: "materials_title" }
  | { key: string; kind: "material"; item: ActBuilderItem; index: number }
  | { key: string; kind: "materials_empty" };

export default function ActBuilderModal(props: Props) {
  const listData = React.useMemo<ActBuilderListEntry[]>(() => {
    const entries: ActBuilderListEntry[] = [];

    if (props.works.length > 0) {
      entries.push(
        ...props.works.map((item, index) => ({
          key: `work:${item.id}`,
          kind: "work" as const,
          item,
          index,
        })),
      );
    } else {
      entries.push({ key: "works_empty", kind: "works_empty" });
    }

    entries.push(
      { key: "counts", kind: "counts" },
      { key: "materials_title", kind: "materials_title" },
    );

    if (props.items.length > 0) {
      entries.push(
        ...props.items.map((item, index) => ({
          key: `material:${item.id}`,
          kind: "material" as const,
          item,
          index,
        })),
      );
    } else {
      entries.push({ key: "materials_empty", kind: "materials_empty" });
    }

    return entries;
  }, [props.items, props.works]);

  const listHeader = React.useMemo(
    () => (
      <ActBuilderHeaderInfo
        jobHeader={props.jobHeader}
        resolvedObjectName={props.resolvedObjectName}
        selectedWorkCount={props.selectedWorkCount}
        selectedMatCount={props.selectedMatCount}
        matSum={props.actBuilderMatSum}
        actDateText={props.actBuilderDateText}
      />
    ),
    [
      props.jobHeader,
      props.resolvedObjectName,
      props.selectedWorkCount,
      props.selectedMatCount,
      props.actBuilderMatSum,
      props.actBuilderDateText,
    ],
  );

  const listFooter = React.useMemo(
    () => <ActBuilderTotalsCard workSum={props.actBuilderWorkSum} matSum={props.actBuilderMatSum} />,
    [props.actBuilderMatSum, props.actBuilderWorkSum],
  );

  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<ActBuilderListEntry>) => {
      switch (item.kind) {
        case "work":
          return (
            <ActBuilderWorkRow
              item={item.item}
              expanded={props.expandedWorkId === item.item.id}
              resolvedObjectName={props.resolvedObjectName}
              onToggleExpanded={() => props.onToggleExpandedWork(item.item.id)}
              onToggleInclude={() => props.onToggleIncludeWork(item.index)}
              onQtyChange={(txt) => props.onQtyChangeWork(item.index, txt)}
              onUnitChange={(txt) => props.onUnitChangeWork(item.index, txt)}
              onPriceChange={(txt) => props.onPriceChangeWork(item.index, txt)}
            />
          );
        case "works_empty":
          return <Text style={{ fontSize: 12, color: "#94a3b8" }}>Нет работ для выбора</Text>;
        case "counts":
          return (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: "#334155", fontSize: 12, marginBottom: 4 }}>
                Работ с выбором: {props.selectedWorkCount}
              </Text>
              <Text style={{ color: "#334155", fontSize: 12 }}>
                Материалов с выбором: {props.selectedMatCount}
              </Text>
            </View>
          );
        case "materials_title":
          return (
            <Text style={{ fontWeight: "700", color: "#334155", marginBottom: 8 }}>
              Материалы по складу
            </Text>
          );
        case "material":
          return (
            <ActBuilderMaterialRow
              item={item.item}
              expanded={props.expandedMatId === item.item.id}
              onToggleExpanded={() => props.onToggleExpandedMat(item.item.id)}
              onToggleInclude={() => props.onToggleIncludeMat(item.index)}
              onDecrement={() => props.onDecrementMat(item.index)}
              onIncrement={() => props.onIncrementMat(item.index)}
              onPriceChange={(txt) => props.onPriceChangeMat(item.index, txt)}
            />
          );
        case "materials_empty":
          return (
            <View
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: "#94a3b8" }}>Нет позиций для акта.</Text>
            </View>
          );
      }
    },
    [props],
  );

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

        <FlashList
          data={listData}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          estimatedItemSize={102}
        />

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
