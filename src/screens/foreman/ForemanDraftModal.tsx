import React from "react";
import { Alert, FlatList, Platform, Pressable, Text, View } from "react-native";
import RNModal from "react-native-modal";
import type { ReqItemRow } from "../../lib/catalog_api";
import CloseIconButton from "../../ui/CloseIconButton";
import DeleteAllButton from "../../ui/DeleteAllButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";

type WebUiApi = {
  confirm?: (message?: string) => boolean;
};

const webUi = globalThis as typeof globalThis & WebUiApi;

type Props = {
  visible: boolean;
  onClose: () => void;
  currentDisplayLabel: string;
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  items: ReqItemRow[];
  renderReqItem: ({ item }: { item: ReqItemRow }) => React.ReactElement;
  screenLock: boolean;
  draftDeleteBusy: boolean;
  draftSendBusy: boolean;
  onDeleteDraft: () => Promise<void>;
  onPdf: () => Promise<void>;
  pdfBusy: boolean;
  onSend: () => Promise<void>;
  ui: { text: string; sub: string; btnNeutral: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanDraftModal(p: Props) {
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
      <View style={p.styles.sheet}>
        <View style={p.styles.sheetHandle} />

        <View style={p.styles.sheetTopBar}>
          <Text style={p.styles.sheetTitle} numberOfLines={1}>
            Черновик {p.currentDisplayLabel}
          </Text>
          <CloseIconButton onPress={p.onClose} accessibilityLabel="Закрыть черновик" size={24} color={p.ui.text} />
        </View>

        <View style={p.styles.sheetMetaBox}>
          {!!p.objectName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Объект: <Text style={p.styles.sheetMetaValue}>{p.objectName}</Text>
            </Text>
          ) : null}
          {!!p.levelName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Этаж/уровень: <Text style={p.styles.sheetMetaValue}>{p.levelName}</Text>
            </Text>
          ) : null}
          {!!p.systemName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Система: <Text style={p.styles.sheetMetaValue}>{p.systemName}</Text>
            </Text>
          ) : null}
          {!!p.zoneName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Зона: <Text style={p.styles.sheetMetaValue}>{p.zoneName}</Text>
            </Text>
          ) : null}
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>
          <FlatList
            data={p.items}
            keyExtractor={(it, idx) => (it?.id ? `ri:${String(it.id)}` : `ri:${idx}`)}
            renderItem={p.renderReqItem}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={{ color: p.ui.sub, fontWeight: "800", paddingVertical: 12 }}>
                Позиции не найдены
              </Text>
            }
          />
        </View>

        <View style={p.styles.reqActionsBottom}>
          <View style={p.styles.actionBtnSquare}>
            <DeleteAllButton
              disabled={p.screenLock}
              loading={p.draftDeleteBusy}
              accessibilityLabel="Удалить черновик"
              onPress={() => {
                const doIt = async () => {
                  await p.onDeleteDraft();
                };

                if (Platform.OS === "web") {
                  const ok =
                    webUi.confirm?.(
                      "Удалить черновик?\n\nВсе позиции будут удалены, будет создан новый черновик.",
                    ) ?? false;
                  if (!ok) return;
                  void doIt();
                  return;
                }

                Alert.alert(
                  "Удалить черновик?",
                  "Все позиции будут удалены, будет создан новый черновик.",
                  [
                    { text: "Отмена", style: "cancel" },
                    { text: "Да, удалить", style: "destructive", onPress: () => void doIt() },
                  ],
                );
              }}
            />
          </View>

          <View style={p.styles.sp8} />

          <Pressable
            disabled={p.screenLock || p.pdfBusy}
            onPress={async () => {
              if (p.screenLock || p.pdfBusy) return;
              try {
                await p.onPdf();
              } catch (e) {
                const message =
                  e && typeof e === "object" && "message" in e
                    ? String((e as { message?: unknown }).message ?? "")
                    : String(e ?? "");
                if (message.toLowerCase().includes("busy")) return;
                Alert.alert("Ошибка", message || "PDF не сформирован");
              }
            }}
            style={[
              p.styles.actionBtnWide,
              { backgroundColor: p.ui.btnNeutral, opacity: p.screenLock || p.pdfBusy ? 0.6 : 1 },
            ]}
          >
            <Text style={p.styles.actionText}>{p.pdfBusy ? "PDF..." : "PDF"}</Text>
          </Pressable>

          <View style={p.styles.sp8} />

          <Pressable
            disabled={p.screenLock}
            onPress={() => {
              if (p.screenLock) return;
              Alert.alert("Excel", "Экспорт Excel будет добавлен позже (UI уже готов).");
            }}
            style={[p.styles.actionBtnWide, { backgroundColor: p.ui.btnNeutral, opacity: p.screenLock ? 0.6 : 1 }]}
          >
            <Text style={p.styles.actionText}>Excel</Text>
          </Pressable>

          <View style={p.styles.sp8} />

          <View style={p.styles.actionBtnSquare}>
            <SendPrimaryButton
              variant="green"
              disabled={p.screenLock || (p.items?.length ?? 0) === 0}
              loading={p.draftSendBusy}
              onPress={async () => {
                if (p.screenLock || (p.items?.length ?? 0) === 0) return;
                await p.onSend();
              }}
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
}
