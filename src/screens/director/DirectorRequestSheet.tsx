import React from "react";
import { Alert, FlatList, Platform, Pressable, Text, View } from "react-native";
import DeleteAllButton from "../../ui/DeleteAllButton";
import RejectItemButton from "../../ui/RejectItemButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import { UI, s } from "./director.styles";
import { type Group, type PendingRow } from "./director.types";

type Props = {
  sheetRequest: Group;
  screenLock: boolean;
  actingId: string | null;
  reqDeleteId: number | string | null;
  reqSendId: number | string | null;
  isRequestPdfBusy: (g: Group) => boolean;
  onRejectItem: (it: PendingRow) => Promise<void>;
  onDeleteAll: (g: Group) => Promise<void>;
  onOpenPdf: (g: Group) => Promise<void>;
  onExportExcel: (g: Group) => void;
  onApproveAndSend: (g: Group) => Promise<void>;
};

type WebUiApi = {
  confirm?: (message?: string) => boolean;
};

const webUi = globalThis as typeof globalThis & WebUiApi;

export default function DirectorRequestSheet({
  sheetRequest,
  screenLock,
  actingId,
  reqDeleteId,
  reqSendId,
  isRequestPdfBusy,
  onRejectItem,
  onDeleteAll,
  onOpenPdf,
  onExportExcel,
  onApproveAndSend,
}: Props) {
  const rid = String(sheetRequest.request_id ?? "").trim();
  const pdfBusy = isRequestPdfBusy(sheetRequest);
  const approveDisabled =
    screenLock ||
    reqDeleteId === sheetRequest.request_id ||
    reqSendId === sheetRequest.request_id ||
    (sheetRequest.items?.length ?? 0) === 0;

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {(() => {
        const headerNote = sheetRequest.items.find((x) => x.note)?.note || null;
        if (!headerNote) return null;

        const lines = headerNote
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 4);

        if (!lines.length) return null;

        return (
          <View style={s.reqNoteBox}>
            {lines.map((line, idx) => (
              <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
        );
      })()}

      <FlatList
        data={sheetRequest.items}
        keyExtractor={(it, idx) => (it.request_item_id ? `mri:${it.request_item_id}` : `mri:${idx}`)}
        contentContainerStyle={{ paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled
        showsVerticalScrollIndicator={false}
        renderItem={({ item: it }) => (
          <View style={s.mobCard}>
            <View style={s.mobMain}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <Text style={[s.mobTitle, { marginRight: 8 }]} numberOfLines={3}>
                  {it.name_human}
                </Text>

                {it.item_kind ? (
                  <View style={[s.kindPill, { marginTop: 4 }]}>
                    <Text style={s.kindPillText}>
                      {it.item_kind === "material"
                        ? "Материал"
                        : it.item_kind === "work"
                          ? "Работа"
                          : it.item_kind === "service"
                            ? "Услуга"
                            : it.item_kind}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={s.mobMeta} numberOfLines={2}>
                {`${it.qty} ${it.uom || ""}`.trim()}
                {it.app_code ? ` · ${it.app_code}` : ""}
              </Text>
            </View>

            <RejectItemButton
              disabled={!it.request_item_id || actingId === it.request_item_id}
              loading={actingId === it.request_item_id}
              onPress={() => void onRejectItem(it)}
            />
          </View>
        )}
      />

      <View style={s.reqActionsBottom}>
        <View style={s.actionBtnSquare}>
          <DeleteAllButton
            disabled={screenLock || reqDeleteId === sheetRequest.request_id || reqSendId === sheetRequest.request_id}
            loading={reqDeleteId === sheetRequest.request_id}
            accessibilityLabel="Удалить заявку"
            onPress={() => {
              const doIt = async () => {
                await onDeleteAll(sheetRequest);
              };

              if (Platform.OS === "web") {
                const ok = webUi.confirm?.("Удалить заявку?\n\nОтклонить ВСЮ заявку вместе со всеми позициями?") ?? false;
                if (!ok) return;
                void doIt();
                return;
              }

              Alert.alert(
                "Удалить заявку?",
                "Вы уверены, что хотите отклонить ВСЮ заявку вместе со всеми позициями?",
                [
                  { text: "Отмена", style: "cancel" },
                  { text: "Да, удалить", style: "destructive", onPress: () => void doIt() },
                ],
              );
            }}
          />
        </View>

        <View style={s.sp8} />

        <Pressable
          disabled={!rid || pdfBusy || screenLock}
          onPress={async () => {
            if (!rid || pdfBusy || screenLock) return;
            try {
              await onOpenPdf(sheetRequest);
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
            s.actionBtnWide,
            { backgroundColor: UI.btnNeutral, opacity: !rid || pdfBusy || screenLock ? 0.6 : 1 },
          ]}
        >
          <Text style={s.actionText}>{pdfBusy ? "PDF..." : "PDF"}</Text>
        </Pressable>

        <View style={s.sp8} />

        <Pressable
          disabled={screenLock}
          onPress={() => {
            if (screenLock) return;
            onExportExcel(sheetRequest);
          }}
          style={[
            s.actionBtnWide,
            { backgroundColor: UI.btnNeutral, opacity: screenLock ? 0.6 : 1 },
          ]}
        >
          <Text style={s.actionText}>Excel</Text>
        </Pressable>

        <View style={s.sp8} />

        <View style={s.actionBtnSquare}>
          <SendPrimaryButton
            variant="green"
            disabled={approveDisabled}
            loading={reqSendId === sheetRequest.request_id}
            onPress={() => void onApproveAndSend(sheetRequest)}
          />
        </View>
      </View>
    </View>
  );
}
