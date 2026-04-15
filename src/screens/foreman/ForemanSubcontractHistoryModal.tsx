import React from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import RNModal from "../../ui/React19SafeModal";
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

type ModalMode = "list" | "details";

export default function ForemanSubcontractHistoryModal({
  visible,
  onClose,
  loading,
  history,
  styles,
  ui,
}: Props) {
  const [mode, setMode] = React.useState<ModalMode>("list");
  const [selected, setSelected] = React.useState<Subcontract | null>(null);
  const [linkedRequests, setLinkedRequests] = React.useState<{ id: string; label: string }[]>([]);
  const [linkedLoading, setLinkedLoading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setMode("list");
      setSelected(null);
      setLinkedRequests([]);
      setLinkedLoading(false);
    }
  }, [visible]);

  const openDetails = React.useCallback(async (item: Subcontract) => {
    setSelected(item);
    setMode("details");
    setLinkedLoading(true);
    try {
      const rows = await listLinkedRequestsByLink(String(item.id || ""));
      setLinkedRequests(
        rows
          .map((row) => ({
            id: String(row.id ?? "").trim(),
            label: String(row.request_no ?? row.display_no ?? "").trim(),
          }))
          .filter((row) => row.id && row.label),
      );
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  const closeDetails = React.useCallback(() => {
    setMode("list");
    setSelected(null);
    setLinkedRequests([]);
    setLinkedLoading(false);
  }, []);

  const handleClose = React.useCallback(() => {
    closeDetails();
    onClose();
  }, [closeDetails, onClose]);

  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={mode === "details" ? closeDetails : handleClose}
      onBackButtonPress={mode === "details" ? closeDetails : handleClose}
      backdropOpacity={0.55}
      statusBarTranslucent={Platform.OS === "android"}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={styles.historyModal}>
        <View style={styles.historyModalHeader}>
          {mode === "details" ? (
            <Pressable onPress={closeDetails} hitSlop={10}>
              <Text style={styles.historyModalClose}>Назад</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={styles.historyModalTitle}>
            {mode === "details" ? "Подряд" : "История подрядов"}
          </Text>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Text style={styles.historyModalClose}>Закрыть</Text>
          </Pressable>
        </View>

        {mode === "list" ? (
          loading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={ui.text} />
            </View>
          ) : history.length === 0 ? (
            <Text style={styles.historyModalEmpty}>Подрядов пока нет.</Text>
          ) : (
            <FlashList
              data={history}
              keyExtractor={(it) => it.id}
              overrideItemLayout={(layout: any) => {
                layout.size = 84;
              }}
              style={styles.historyModalList}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => {
                const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                return (
                  <Pressable
                    style={styles.historyModalRow}
                    onPress={() => void openDetails(item)}
                    hitSlop={8}
                  >
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
          )
        ) : (
          <View style={{ gap: 18 }}>
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

            <View style={{ gap: 8 }}>
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
        )}
      </View>
    </RNModal>
  );
}
