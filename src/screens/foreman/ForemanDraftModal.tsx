import React, { useMemo } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import RNModal from "../../ui/React19SafeModal";

import type { ReqItemRow } from "../../lib/catalog_api";
import type { ForemanDraftRecoveryAction } from "../../lib/offline/foremanSyncRuntime";
import CloseIconButton from "../../ui/CloseIconButton";
import DeleteAllButton from "../../ui/DeleteAllButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import { buildForemanDraftVisualModel } from "./foremanDraftVisualState";

type WebUiApi = {
  confirm: (message?: string) => boolean;
};

const getWebUi = (): WebUiApi => {
  return {
    confirm(message?: string) {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        return window.confirm(message ?? "");
      }
      if (!globalThis || typeof globalThis !== "object") return false;
      const candidate = globalThis as Record<string, unknown>;
      const confirm = candidate.confirm;
      if (typeof confirm !== "function") return false;
      try {
        return Boolean(confirm.call(globalThis, message));
      } catch {
        return false;
      }
    },
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  currentDisplayLabel: string;
  draftSyncStatusLabel: string;
  draftSyncStatusDetail: string | null;
  draftSyncStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  items: ReqItemRow[];
  renderReqItem: ({ item }: { item: ReqItemRow }) => React.ReactElement | null;
  screenLock: boolean;
  draftDeleteBusy: boolean;
  draftSendBusy: boolean;
  onDeleteDraft: () => Promise<void>;
  onPdf: () => Promise<void>;
  pdfBusy: boolean;
  onSend: () => Promise<void>;
  availableRecoveryActions: ForemanDraftRecoveryAction[];
  onRetryNow: () => Promise<void>;
  onRehydrateFromServer: () => Promise<void>;
  onRestoreLocal: () => Promise<void>;
  onDiscardLocal: () => Promise<void>;
  onClearFailedQueue: () => Promise<void>;
  ui: { text: string; sub: string; btnNeutral: string };
  styles: typeof import("./foreman.styles").s;
};

const hasRecoveryAction = (actions: ForemanDraftRecoveryAction[], action: ForemanDraftRecoveryAction) =>
  actions.includes(action);

const resolveToneStyle = (tone: Props["draftSyncStatusTone"]) => {
  if (tone === "success") {
    return { bg: "rgba(34,197,94,0.16)", fg: "#86efac" };
  }
  if (tone === "info") {
    return { bg: "rgba(56,189,248,0.16)", fg: "#7dd3fc" };
  }
  if (tone === "warning") {
    return { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d" };
  }
  if (tone === "danger") {
    return { bg: "rgba(248,113,113,0.16)", fg: "#fca5a5" };
  }
  return { bg: "rgba(148,163,184,0.16)", fg: "#cbd5e1" };
};

export default function ForemanDraftModal(p: Props) {
  const webUi = getWebUi();
  const draftVisualModel = useMemo(
    () =>
      buildForemanDraftVisualModel({
        requestLabel: p.currentDisplayLabel,
        itemsCount: p.items.length,
        syncLabel: p.draftSyncStatusLabel,
        syncDetail: p.draftSyncStatusDetail,
        syncTone: p.draftSyncStatusTone,
        isSubmitting: p.draftSendBusy,
      }),
    [
      p.currentDisplayLabel,
      p.draftSendBusy,
      p.draftSyncStatusDetail,
      p.draftSyncStatusLabel,
      p.draftSyncStatusTone,
      p.items.length,
    ],
  );
  const syncToneStyle = useMemo(() => resolveToneStyle(draftVisualModel.tone), [draftVisualModel.tone]);

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
            Черновик {draftVisualModel.requestLabel}
          </Text>
          <CloseIconButton onPress={p.onClose} accessibilityLabel="Закрыть черновик" size={24} color={p.ui.text} />
        </View>

        <View style={p.styles.sheetMetaBox}>
          <View
            style={{
              alignSelf: "flex-start",
              marginBottom: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: syncToneStyle.bg,
            }}
          >
            <Text style={{ color: syncToneStyle.fg, fontWeight: "800", fontSize: 11 }}>
              {draftVisualModel.statusLabel}
            </Text>
          </View>
          {draftVisualModel.helperText ? (
            <Text style={[p.styles.sheetMetaLine, { marginBottom: 8 }]} numberOfLines={2}>
              <Text style={p.styles.sheetMetaValue}>{draftVisualModel.helperText}</Text>
            </Text>
          ) : null}
          {!!p.objectName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Объект: <Text style={p.styles.sheetMetaValue}>{p.objectName}</Text>
            </Text>
          ) : null}
          {!!p.levelName ? (
            <Text style={p.styles.sheetMetaLine} numberOfLines={1}>
              Этаж / уровень: <Text style={p.styles.sheetMetaValue}>{p.levelName}</Text>
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

        {p.availableRecoveryActions.length ? (
          <View style={[p.styles.sheetMetaBox, { marginTop: 10, gap: 8 }]}>
            <Text style={[p.styles.sheetMetaLine, { fontWeight: "800" }]}>Восстановление</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {hasRecoveryAction(p.availableRecoveryActions, "retry_now") ? (
                <Pressable
                  onPress={() => void p.onRetryNow()}
                  style={[p.styles.actionBtnWide, { width: "48%", backgroundColor: p.ui.btnNeutral }]}
                >
                  <Text style={p.styles.actionText}>Повторить</Text>
                </Pressable>
              ) : null}
              {hasRecoveryAction(p.availableRecoveryActions, "rehydrate_server") ? (
                <Pressable
                  onPress={() => void p.onRehydrateFromServer()}
                  style={[p.styles.actionBtnWide, { width: "48%", backgroundColor: p.ui.btnNeutral }]}
                >
                  <Text style={p.styles.actionText}>Взять с сервера</Text>
                </Pressable>
              ) : null}
              {hasRecoveryAction(p.availableRecoveryActions, "restore_local") ? (
                <Pressable
                  onPress={() => void p.onRestoreLocal()}
                  style={[p.styles.actionBtnWide, { width: "48%", backgroundColor: p.ui.btnNeutral }]}
                >
                  <Text style={p.styles.actionText}>Вернуть локальную</Text>
                </Pressable>
              ) : null}
              {hasRecoveryAction(p.availableRecoveryActions, "clear_failed_queue") ? (
                <Pressable
                  onPress={() => void p.onClearFailedQueue()}
                  style={[p.styles.actionBtnWide, { width: "48%", backgroundColor: p.ui.btnNeutral }]}
                >
                  <Text style={p.styles.actionText}>Очистить очередь</Text>
                </Pressable>
              ) : null}
              {hasRecoveryAction(p.availableRecoveryActions, "discard_local") ? (
                <Pressable
                  onPress={() => {
                    const doDiscard = async () => {
                      await p.onDiscardLocal();
                    };

                    if (Platform.OS === "web") {
                      const ok = webUi.confirm(
                        "Удалить локальную версию черновика?\n\nНесинхронизированные изменения на этом устройстве будут потеряны.",
                      );
                      if (!ok) return;
                      void doDiscard();
                      return;
                    }

                    Alert.alert(
                      "Удалить локальную версию черновика?",
                      "Несинхронизированные изменения на этом устройстве будут потеряны.",
                      [
                        { text: "Отмена", style: "cancel" },
                        { text: "Удалить", style: "destructive", onPress: () => void doDiscard() },
                      ],
                    );
                  }}
                  style={[p.styles.actionBtnWide, { width: "48%", backgroundColor: "rgba(239,68,68,0.16)" }]}
                >
                  <Text style={p.styles.actionText}>Удалить локальную</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: 0 }}>
          <FlashList
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
                  const ok = webUi.confirm(
                    "Удалить черновик?\n\nВесь черновик будет отменён и очищен.",
                  );
                  if (!ok) return;
                  void doIt();
                  return;
                }

                Alert.alert(
                  "Удалить черновик?",
                  "Весь черновик будет отменён и очищен.",
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
              Alert.alert("Excel", "Экспорт Excel будет добавлен позже. UI для этого уже готов.");
            }}
            style={[p.styles.actionBtnWide, { backgroundColor: p.ui.btnNeutral, opacity: p.screenLock ? 0.6 : 1 }]}
          >
            <Text style={p.styles.actionText}>Excel</Text>
          </Pressable>

          <View style={p.styles.sp8} />

          <View style={p.styles.actionBtnSquare}>
            <SendPrimaryButton
              variant="green"
              disabled={p.screenLock || p.items.length === 0}
              loading={p.draftSendBusy}
              onPress={async () => {
                if (p.screenLock || p.items.length === 0) return;
                await p.onSend();
              }}
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
}
