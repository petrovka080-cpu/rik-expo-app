import React from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { Ionicons } from "@expo/vector-icons";
import RNModal from "react-native-modal";

import type { ForemanRequestSummary } from "../../lib/catalog_api";

type StatusInfo = { label: string; bg: string; fg: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: "list" | "details";
  selectedRequestId: string | null;
  onShowDetails: (request: ForemanRequestSummary) => void;
  onBackToList: () => void;
  onResetView: () => void;
  loading: boolean;
  requests: ForemanRequestSummary[];
  resolveStatusInfo: (status: string | null | undefined) => StatusInfo;
  onSelect: (request: ForemanRequestSummary) => void;
  onReopen: (request: ForemanRequestSummary) => void | Promise<void>;
  reopenBusyRequestId: string | null;
  onOpenPdf: (reqId: string) => void;
  isPdfBusy: (key: string) => boolean;
  shortId: (id: string) => string;
  styles: typeof import("./foreman.styles").s;
};

const HISTORY_TITLE = "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u044f\u0432\u043e\u043a";
const DETAILS_TITLE = "\u0417\u0430\u044f\u0432\u043a\u0430";
const CLOSE_LABEL = "\u0417\u0430\u043a\u0440\u044b\u0442\u044c";
const BACK_LABEL = "\u041d\u0430\u0437\u0430\u0434";
const EMPTY_LABEL = "\u0417\u0430\u044f\u0432\u043e\u043a \u043f\u043e\u043a\u0430 \u043d\u0435\u0442";
const REOPEN_LABEL = "\u0412\u0435\u0440\u043d\u0443\u0442\u044c \u0432 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a";
const REJECTED_LABEL = "\u041e\u0442\u043a\u0430\u0437";
const REJECTED_POSITIONS_LABEL = "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043d\u044b\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u0438";

const isCancelledStatus = (status: string | null | undefined) => {
  const normalized = String(status ?? "").trim().toLowerCase();
  return (
    normalized.includes("\u043e\u0442\u043c\u0435\u043d") ||
    normalized === "cancelled" ||
    normalized === "canceled"
  );
};

export default function ForemanHistoryModal(props: Props) {
  const selectedRequest = React.useMemo(
    () => props.requests.find((entry) => entry.id === props.selectedRequestId) ?? null,
    [props.requests, props.selectedRequestId],
  );

  React.useEffect(() => {
    if (!props.visible) {
      props.onResetView();
      return;
    }
    if (props.selectedRequestId && !selectedRequest) {
      props.onResetView();
    }
  }, [props, selectedRequest]);

  const closeOrBack = React.useCallback(() => {
    if (props.mode === "details") {
      props.onBackToList();
      return;
    }
    props.onClose();
  }, [props]);

  const renderRequestItem = React.useCallback(
    ({ item: request }: { item: ForemanRequestSummary }) => {
      const info = props.resolveStatusInfo(request.status);
      const created = request.created_at ? new Date(request.created_at).toLocaleDateString("ru-RU") : "-";
      const hasRejected = !!request.has_rejected;
      const isCancelled = isCancelledStatus(request.status);
      const pdfKey = `pdf:history:${String(request.id).trim()}`;
      const pdfBusy = props.isPdfBusy(pdfKey);

      return (
        <View style={props.styles.historyModalRow}>
          <Pressable
            style={{ flex: 1, minWidth: 0, paddingRight: 8 }}
            onPress={() => (isCancelled ? props.onShowDetails(request) : props.onSelect(request))}
          >
            <Text style={props.styles.historyModalPrimary} numberOfLines={1}>
              {request.display_no ?? props.shortId(request.id)}
            </Text>
            <Text style={props.styles.historyModalMeta} numberOfLines={1}>
              {request.object_name_ru || "-"}
            </Text>
            <Text style={props.styles.historyModalMetaSecondary}>{created}</Text>
            {hasRejected ? (
              <Text style={{ color: "#F87171", fontSize: 11, marginTop: 4, fontWeight: "800" }}>
                {REJECTED_POSITIONS_LABEL}
              </Text>
            ) : null}
          </Pressable>

          <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
            <View
              style={[
                props.styles.historyStatusBadge,
                { backgroundColor: hasRejected ? "rgba(239,68,68,0.15)" : info.bg },
              ]}
            >
              <Text
                style={[
                  props.styles.historyStatusBadgeText,
                  { color: hasRejected ? "#F87171" : info.fg },
                ]}
              >
                {hasRejected ? REJECTED_LABEL : info.label}
              </Text>
            </View>

            <Pressable
              disabled={pdfBusy}
              onPress={() => props.onOpenPdf(request.id)}
              style={[props.styles.historyPdfBtn, pdfBusy && { opacity: 0.6 }]}
            >
              <Text style={props.styles.historyPdfBtnText}>{pdfBusy ? "..." : "PDF"}</Text>
            </Pressable>

            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
          </View>
        </View>
      );
    },
    [props],
  );

  const detailsStatus = selectedRequest ? props.resolveStatusInfo(selectedRequest.status) : null;
  const selectedPdfKey = selectedRequest ? `pdf:history:${String(selectedRequest.id).trim()}` : null;
  const selectedPdfBusy = selectedPdfKey ? props.isPdfBusy(selectedPdfKey) : false;

  return (
    <RNModal
      isVisible={props.visible}
      onBackdropPress={closeOrBack}
      onBackButtonPress={closeOrBack}
      backdropOpacity={0.55}
      statusBarTranslucent={Platform.OS === "android"}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={props.styles.historyModal}>
          <View style={props.styles.historyModalHeader}>
          <Text style={props.styles.historyModalTitle}>{props.mode === "details" ? DETAILS_TITLE : HISTORY_TITLE}</Text>
          <Pressable onPress={closeOrBack}>
            <Text style={props.styles.historyModalClose}>{props.mode === "details" ? BACK_LABEL : CLOSE_LABEL}</Text>
          </Pressable>
        </View>

        <View style={props.styles.historyModalBody}>
          {props.mode === "details" && selectedRequest && detailsStatus ? (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text style={props.styles.historyModalPrimary}>
                  {selectedRequest.display_no ?? props.shortId(selectedRequest.id)}
                </Text>
                <Text style={props.styles.historyModalMeta}>{selectedRequest.object_name_ru || "-"}</Text>
                <Text style={props.styles.historyModalMetaSecondary}>
                  {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString("ru-RU") : "-"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[props.styles.historyStatusBadge, { backgroundColor: detailsStatus.bg }]}>
                  <Text style={[props.styles.historyStatusBadgeText, { color: detailsStatus.fg }]}>
                    {detailsStatus.label}
                  </Text>
                </View>

                <Pressable
                  disabled={selectedPdfBusy}
                  onPress={() => props.onOpenPdf(selectedRequest.id)}
                  style={[props.styles.historyPdfBtn, selectedPdfBusy && { opacity: 0.6 }]}
                >
                  <Text style={props.styles.historyPdfBtnText}>{selectedPdfBusy ? "..." : "PDF"}</Text>
                </Pressable>
              </View>

              <Pressable
                disabled={props.reopenBusyRequestId === selectedRequest.id}
                onPress={() => void props.onReopen(selectedRequest)}
                style={[
                  props.styles.actionBtnWide,
                  {
                    backgroundColor: "rgba(34,197,94,0.16)",
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.35)",
                    opacity: props.reopenBusyRequestId === selectedRequest.id ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={props.styles.actionText}>
                  {props.reopenBusyRequestId === selectedRequest.id ? "..." : REOPEN_LABEL}
                </Text>
              </Pressable>
            </View>
          ) : props.loading ? (
            <ActivityIndicator />
          ) : props.requests.length === 0 ? (
            <Text style={props.styles.historyModalEmpty}>{EMPTY_LABEL}</Text>
          ) : (
            <FlashList
              data={props.requests}
              renderItem={renderRequestItem}
              keyExtractor={(item) => item.id}
              overrideItemLayout={(layout: any) => {
                layout.size = 88;
              }}
              style={props.styles.historyModalList}
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

