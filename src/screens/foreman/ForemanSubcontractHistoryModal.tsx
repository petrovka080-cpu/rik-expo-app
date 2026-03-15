import React from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import RNModal from "react-native-modal";
import { STATUS_CONFIG, fmtAmount, type Subcontract } from "../subcontracts/subcontracts.shared";
import { listLinkedRequestsByLink } from "./foreman.requests";

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  history: Subcontract[];
  styles: typeof import("./foreman.styles").s;
  ui: { text: string };
};

export default function ForemanSubcontractHistoryModal({
  visible,
  onClose,
  loading,
  history,
  styles,
  ui,
}: Props) {
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const [selected, setSelected] = React.useState<Subcontract | null>(null);
  const [linkedRequests, setLinkedRequests] = React.useState<Array<{ id: string; label: string }>>([]);
  const [linkedLoading, setLinkedLoading] = React.useState(false);

  const openDetails = React.useCallback(async (item: Subcontract) => {
    setSelected(item);
    setDetailsVisible(true);
    setLinkedLoading(true);
    try {
      const rows = await listLinkedRequestsByLink(String(item.id || ""));
      setLinkedRequests(
        rows.map((row) => ({
          id: String(row.id ?? "").trim(),
          label: String(row.request_no ?? row.display_no ?? "").trim(),
        })).filter((row) => row.id && row.label),
      );
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  const closeDetails = React.useCallback(() => {
    setDetailsVisible(false);
    setSelected(null);
    setLinkedRequests([]);
    setLinkedLoading(false);
  }, []);

  return (
    <>
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
                return (
                  <Pressable style={styles.historyModalRow} onPress={() => void openDetails(item)}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.historyModalPrimary} numberOfLines={1}>
                        {item.contractor_org || "Без компании"}
                      </Text>
                      <Text style={styles.historyModalMeta} numberOfLines={1}>
                        {item.object_name || "—"}
                      </Text>
                      <Text style={styles.historyModalMetaSecondary} numberOfLines={1}>
                        {item.work_type || "—"}
                      </Text>
                    </View>
                    <View style={[styles.historyStatusBadge, { backgroundColor: st.bg }]}>
                      <Text style={{ color: st.fg, fontWeight: "900", fontSize: 12 }}>{st.label}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </RNModal>

      <RNModal
        isVisible={detailsVisible}
        onBackdropPress={closeDetails}
        onBackButtonPress={closeDetails}
        backdropOpacity={0.55}
        useNativeDriver={Platform.OS !== "web"}
        useNativeDriverForBackdrop={Platform.OS !== "web"}
        hideModalContentWhileAnimating
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View style={styles.historyModal}>
          <View style={styles.historyModalHeader}>
            <Text style={styles.historyModalTitle}>Подряд</Text>
            <Pressable onPress={closeDetails}>
              <Text style={styles.historyModalClose}>Закрыть</Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={styles.historyModalPrimary}>{selected?.contractor_org || "Без компании"}</Text>
            <Text style={styles.historyModalMeta}>Объект: {selected?.object_name || "—"}</Text>
            <Text style={styles.historyModalMeta}>Работа: {selected?.work_type || "—"}</Text>
            <Text style={styles.historyModalMeta}>
              Объём: {`${fmtAmount(selected?.qty_planned)} ${selected?.uom || ""}`.trim() || "—"}
            </Text>
            <Text style={styles.historyModalMeta}>
              Статус: {(selected && (STATUS_CONFIG[selected.status] || STATUS_CONFIG.draft).label) || "—"}
            </Text>
          </View>

          <View style={{ marginTop: 18, gap: 8 }}>
            <Text style={[styles.historyModalPrimary, { fontSize: 14 }]}>Заявки по этому подряду</Text>
            {linkedLoading ? (
              <ActivityIndicator color={ui.text} />
            ) : linkedRequests.length === 0 ? (
              <Text style={styles.historyModalEmpty}>Связанных заявок пока нет.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {linkedRequests.map((req) => (
                  <View
                    key={req.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text style={styles.historyModalMeta}>{req.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </RNModal>
    </>
  );
}
