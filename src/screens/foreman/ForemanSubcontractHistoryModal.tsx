import React from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import RNModal from "react-native-modal";
import { STATUS_CONFIG, fmtAmount, type Subcontract } from "../subcontracts/subcontracts.shared";

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  history: Subcontract[];
  onSelect?: (item: Subcontract) => void;
  styles: typeof import("./foreman.styles").s;
  ui: { text: string };
};

export default function ForemanSubcontractHistoryModal({
  visible,
  onClose,
  loading,
  history,
  onSelect,
  styles,
  ui,
}: Props) {
  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={styles.historyModal}>
        <View style={styles.historyModalHeader}>
          <Text style={styles.historyModalTitle}>История подрядов</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.historyModalClose}>Закрыть</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator color={ui.text} />
          </View>
        ) : history.length === 0 ? (
          <Text style={styles.historyModalEmpty}>Подрядов пока нет.</Text>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item }) => {
              const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
              const body = (
                <>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historyModalPrimary}>Подряд</Text>
                    <Text style={styles.historyModalMeta} numberOfLines={1}>
                      {item.object_name || "—"} · {item.work_type || "—"}
                    </Text>
                    <Text style={styles.historyModalMetaSecondary} numberOfLines={1}>
                      {fmtAmount(item.qty_planned)} {item.uom || ""}
                    </Text>
                  </View>
                  <View style={[styles.historyStatusBadge, { backgroundColor: st.bg }]}>
                    <Text style={{ color: st.fg, fontWeight: "900", fontSize: 12 }}>{st.label}</Text>
                  </View>
                </>
              );

              if (!onSelect) {
                return <View style={styles.historyModalRow}>{body}</View>;
              }

              return (
                <Pressable style={styles.historyModalRow} onPress={() => onSelect(item)}>
                  {body}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </RNModal>
  );
}
