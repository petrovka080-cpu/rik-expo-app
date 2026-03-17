import React from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNModal from "react-native-modal";
import type { ForemanRequestSummary } from "../../lib/catalog_api";

type StatusInfo = { label: string; bg: string; fg: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  requests: ForemanRequestSummary[];
  resolveStatusInfo: (status: string | null | undefined) => StatusInfo;
  onSelect: (reqId: string) => void;
  onOpenPdf: (reqId: string) => void;
  isPdfBusy: (key: string) => boolean;
  shortId: (id: string) => string;
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanHistoryModal(p: Props) {
  const renderRequestItem = React.useCallback(({ item: req }: { item: ForemanRequestSummary }) => {
    const info = p.resolveStatusInfo(req.status);
    const created = req.created_at ? new Date(req.created_at).toLocaleDateString("ru-RU") : "-";
    const hasRejected = !!req.has_rejected;
    const pdfKey = `pdf:history:${String(req.id).trim()}`;
    const pdfBusy = p.isPdfBusy(pdfKey);

    return (
      <View style={p.styles.historyModalRow}>
        <Pressable style={{ flex: 1, minWidth: 0, paddingRight: 8 }} onPress={() => p.onSelect(req.id)}>
          <Text style={p.styles.historyModalPrimary} numberOfLines={1}>
            {req.display_no ?? p.shortId(req.id)}
          </Text>
          <Text style={p.styles.historyModalMeta} numberOfLines={1}>
            {req.object_name_ru || "-"}
          </Text>
          <Text style={p.styles.historyModalMetaSecondary}>{created}</Text>
          {hasRejected ? (
            <Text style={{ color: "#F87171", fontSize: 11, marginTop: 4, fontWeight: "800" }}>
              ⚠️ Отклоненные позиции
            </Text>
          ) : null}
        </Pressable>

        <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
          <View style={[p.styles.historyStatusBadge, { backgroundColor: hasRejected ? "rgba(239,68,68,0.15)" : info.bg }]}>
            <Text style={[p.styles.historyStatusBadgeText, { color: hasRejected ? "#F87171" : info.fg }]}>
              {hasRejected ? "Отказ" : info.label}
            </Text>
          </View>

          <Pressable
            disabled={pdfBusy}
            onPress={() => p.onOpenPdf(req.id)}
            style={[p.styles.historyPdfBtn, pdfBusy && { opacity: 0.6 }]}
          >
            <Text style={p.styles.historyPdfBtnText}>{pdfBusy ? "..." : "PDF"}</Text>
          </Pressable>

          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
        </View>
      </View>
    );
  }, [p]);

  return (
    <RNModal
      isVisible={p.visible}
      onBackdropPress={p.onClose}
      onBackButtonPress={p.onClose}
      backdropOpacity={0.55}
      statusBarTranslucent={Platform.OS === "android"}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={p.styles.historyModal}>
        <View style={p.styles.historyModalHeader}>
          <Text style={p.styles.historyModalTitle}>История заявок</Text>
          <Pressable onPress={p.onClose}>
            <Text style={p.styles.historyModalClose}>Закрыть</Text>
          </Pressable>
        </View>

        <View style={p.styles.historyModalBody}>
          {p.loading ? (
            <ActivityIndicator />
          ) : p.requests.length === 0 ? (
            <Text style={p.styles.historyModalEmpty}>Заявок пока нет</Text>
          ) : (
            <FlatList
              data={p.requests}
              renderItem={renderRequestItem}
              keyExtractor={(item) => item.id}
              style={p.styles.historyModalList}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              removeClippedSubviews
            />
          )}
        </View>
      </View>
    </RNModal>
  );
}
