import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import DeleteAllButton from "../../ui/DeleteAllButton";
import RejectItemButton from "../../ui/RejectItemButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import { UI, s } from "./director.styles";
import { type ProposalAttachmentRow, type ProposalItem, type RequestMeta } from "./director.types";
import DirectorProposalAttachments from "./DirectorProposalAttachments";
import DirectorProposalRequestContext from "./DirectorProposalRequestContext";

type Props = {
  pidStr: string;
  items: ProposalItem[];
  loaded: boolean;
  totalSum: number;
  screenLock: boolean;
  decidingId: string | null;
  actingPropItemId: number | null;
  propReturnId: string | null;
  propApproveId: string | null;
  approveDisabled: boolean;
  files: ProposalAttachmentRow[];
  busyAtt: boolean;
  reqItemNoteById: Record<string, string>;
  propReqIds: string[];
  reqMetaById: Record<string, RequestMeta>;
  isPdfBusy: boolean;
  onRefreshAttachments: () => void;
  onOpenAttachment: (url: string, fileName: string) => void;
  onRejectItem: (it: ProposalItem) => Promise<void>;
  onReturn: () => void;
  onPdf: () => Promise<void>;
  onExcel: () => Promise<void>;
  onApprove: () => Promise<void>;
};

export default function DirectorProposalSheet({
  pidStr,
  items,
  loaded,
  totalSum,
  screenLock,
  decidingId,
  actingPropItemId,
  propReturnId,
  propApproveId,
  approveDisabled,
  files,
  busyAtt,
  reqItemNoteById,
  propReqIds,
  reqMetaById,
  isPdfBusy,
  onRefreshAttachments,
  onOpenAttachment,
  onRejectItem,
  onReturn,
  onPdf,
  onExcel,
  onApprove,
}: Props) {
  if (!loaded) return <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>;
  if (!items.length) {
    return (
      <Text style={{ opacity: 0.75, color: UI.sub }}>
        Состав пуст — утвердить нельзя
      </Text>
    );
  }

  return (
    <>
      <DirectorProposalRequestContext
        pidStr={pidStr}
        items={items}
        reqItemNoteById={reqItemNoteById}
        propReqIds={propReqIds}
        reqMetaById={reqMetaById}
      />

      <DirectorProposalAttachments
        files={files}
        busyAtt={busyAtt}
        onRefresh={onRefreshAttachments}
        onOpenUrl={onOpenAttachment}
      />

      <FlatList
        data={items}
        keyExtractor={(it, idx) => `pi:${pidStr}:${it.id}:${idx}`}
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
                      {it.item_kind === "material" ? "Материал"
                        : it.item_kind === "work" ? "Работа"
                          : it.item_kind === "service" ? "Услуга"
                            : it.item_kind}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.mobMeta}>
                {`${it.total_qty} ${it.uom || ""}`.trim()}
                {it.price != null ? ` · цена ${it.price}` : ""}
                {it.price != null ? ` · сумма ${Math.round(Number(it.price) * Number(it.total_qty || 0))}` : ""}
                {it.app_code ? ` · ${it.app_code}` : ""}
              </Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <RejectItemButton
                disabled={decidingId === pidStr || actingPropItemId === Number(it.id)}
                loading={actingPropItemId === Number(it.id)}
                onPress={() => void onRejectItem(it)}
              />
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={{ paddingTop: 10, paddingBottom: 6, alignItems: "flex-end" }}>
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ fontWeight: "900", color: UI.text, fontSize: 14 }}>
                ИТОГО: {Math.round(totalSum)}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={s.reqActionsBottom}>
        <View style={s.actionBtnSquare}>
          <DeleteAllButton
            disabled={screenLock || propReturnId === pidStr || propApproveId === pidStr}
            loading={propReturnId === pidStr}
            accessibilityLabel="Вернуть/Отклонить"
            onPress={onReturn}
          />
        </View>

        <View style={s.sp8} />

        <Pressable
          disabled={isPdfBusy || screenLock}
          style={[
            s.actionBtnWide,
            { backgroundColor: UI.btnNeutral, opacity: (isPdfBusy || screenLock) ? 0.6 : 1 },
          ]}
          onPress={() => void onPdf()}
        >
          <Text style={s.actionText}>{isPdfBusy ? "PDF…" : "PDF"}</Text>
        </Pressable>

        <View style={s.sp8} />

        <Pressable
          disabled={screenLock}
          style={[
            s.actionBtnWide,
            { backgroundColor: UI.btnNeutral, opacity: screenLock ? 0.6 : 1 },
          ]}
          onPress={() => void onExcel()}
        >
          <Text style={s.actionText}>Excel</Text>
        </Pressable>

        <View style={s.sp8} />

        <View style={s.actionBtnSquare}>
          <SendPrimaryButton
            variant="green"
            disabled={approveDisabled}
            loading={propApproveId === pidStr}
            onPress={() => void onApprove()}
          />
        </View>
      </View>
    </>
  );
}
