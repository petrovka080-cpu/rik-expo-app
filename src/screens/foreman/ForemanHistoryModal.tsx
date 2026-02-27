import React from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
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
  return (
    <RNModal
      isVisible={p.visible}
      onBackdropPress={p.onClose}
      onBackButtonPress={p.onClose}
      backdropOpacity={0.55}
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
            <ScrollView style={p.styles.historyModalList}>
              {p.requests.map((req) => {
                const info = p.resolveStatusInfo(req.status);
                const created = req.created_at ? new Date(req.created_at).toLocaleDateString("ru-RU") : "-";
                const hasRejected = !!req.has_rejected;
                const pdfKey = `pdf:history:${String(req.id).trim()}`;
                const pdfBusy = p.isPdfBusy(pdfKey);

                return (
                  <View key={req.id} style={p.styles.historyModalRow}>
                    <Pressable style={{ flex: 1 }} onPress={() => p.onSelect(req.id)}>
                      <Text style={p.styles.historyModalPrimary}>{req.display_no ?? p.shortId(req.id)}</Text>
                      <Text style={p.styles.historyModalMeta}>{req.object_name_ru || "-"}</Text>
                      <Text style={p.styles.historyModalMetaSecondary}>{created}</Text>
                      {hasRejected ? (
                        <Text style={{ color: "#B91C1C", fontSize: 12, marginTop: 2, fontWeight: "600" }}>
                          Есть отклоненные позиции
                        </Text>
                      ) : null}
                    </Pressable>

                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={[p.styles.historyStatusBadge, { backgroundColor: hasRejected ? "#FEE2E2" : info.bg }]}>
                        <Text style={{ color: info.fg, fontWeight: "700" }}>{info.label}</Text>
                      </View>

                      <Pressable
                        disabled={pdfBusy}
                        onPress={() => p.onOpenPdf(req.id)}
                        style={[p.styles.historyPdfBtn, pdfBusy && { opacity: 0.6 }]}
                      >
                        <Text style={p.styles.historyPdfBtnText}>{pdfBusy ? "PDF..." : "PDF"}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </RNModal>
  );
}
