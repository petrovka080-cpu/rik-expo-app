import React from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";

import type { Attachment, DraftAttachmentMap } from "../buyer.types";
import { D, UI } from "../buyerUi";
import { normName, SUPP_NONE } from "../buyerUtils";
import { AttachmentUploaderAny } from "./AttachmentUploaderAny";
import { WideActionButton } from "./common/WideActionButton";
import type { StateSetter, StylesBag } from "./component.types";

type ReworkItem = {
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: string;
  supplier?: string;
  note?: string;
};
export function BuyerReworkSheetBody({
  s,

  rwBusy,
  rwPid,
  rwReason,

  rwItems,
  setRwItems,

  rwInvNumber,
  setRwInvNumber,
  rwInvDate,
  setRwInvDate,
  rwInvAmount,
  setRwInvAmount,
  rwInvCurrency,
  setRwInvCurrency,

  rwInvFile,
  setRwInvFile,
  rwInvUploadedName,
  pickInvoiceFile,

  rwSaveItems,
  rwSendToDirector,
  rwSendToAccounting,
  closeSheet,
}: {
  s: StylesBag;

  rwBusy: boolean;
  rwPid: string | null;
  rwReason: string;

  rwItems: ReworkItem[];
  setRwItems: StateSetter<ReworkItem[]>;

  rwInvNumber: string;
  setRwInvNumber: (v: string) => void;
  rwInvDate: string;
  setRwInvDate: (v: string) => void;
  rwInvAmount: string;
  setRwInvAmount: (v: string) => void;
  rwInvCurrency: string;
  setRwInvCurrency: (v: string) => void;

  rwInvFile: Attachment["file"] | null;
  setRwInvFile: (v: Attachment["file"] | null) => void;
  rwInvUploadedName: string;
  pickInvoiceFile: () => Promise<Attachment["file"] | null | void>;

  rwSaveItems: () => Promise<void> | void;
  rwSendToDirector: () => Promise<void> | void;
  rwSendToAccounting: () => Promise<void> | void;
  closeSheet: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>
        {rwPid ? `Документ: #${rwPid.slice(0, 8)}` : "Документ не выбран"}
      </Text>

      {!!rwReason && (
        <View
          style={{
            marginTop: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ fontWeight: "900", color: "#F59E0B" }}>Причина возврата</Text>
          <Text style={{ color: D.text, marginTop: 6, fontWeight: "700" }}>
            {rwReason || "—"}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        {rwItems.length === 0 ? (
          <Text style={{ color: D.sub, fontWeight: "800" }}>
            {rwBusy ? "Загрузка…" : "Нет строк в предложении"}
          </Text>
        ) : (
          rwItems.map((it, idx: number) => (
            <View
              key={`${it.request_item_id}-${idx}`}
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 18,
                backgroundColor: "rgba(16,24,38,0.92)",
                borderWidth: 1.25,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>
                {it.name_human || `Позиция ${it.request_item_id}`}
              </Text>

              <Text style={{ color: D.sub, fontWeight: "800", marginTop: 6 }}>
                {`${it.qty ?? "—"} ${it.uom ?? ""}`}
              </Text>

              <TextInput
                placeholder="Цена"
                keyboardType="decimal-pad"
                value={it.price ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, price: v } : x))
                  )
                }
                style={[s.input, { marginTop: 10 }]}
              />

              <TextInput
                placeholder="Поставщик"
                value={it.supplier ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, supplier: v } : x))
                  )
                }
                style={[s.input, { marginTop: 10 }]}
              />

              <TextInput
                placeholder="Примечание"
                value={it.note ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, note: v } : x))
                  )
                }
                multiline
                style={[s.input, { marginTop: 10, minHeight: 70 }]}
              />
            </View>
          ))
        )}
      </View>

      {/* INVOICE (если возврат от бухгалтера) */}
      <View style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>Счёт</Text>

        <TextInput
          placeholder="Номер счёта"
          value={rwInvNumber}
          onChangeText={setRwInvNumber}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Дата (YYYY-MM-DD)"
          value={rwInvDate}
          onChangeText={setRwInvDate}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Сумма"
          keyboardType="decimal-pad"
          value={rwInvAmount}
          onChangeText={setRwInvAmount}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Валюта"
          value={rwInvCurrency}
          onChangeText={setRwInvCurrency}
          style={[s.input, { marginTop: 6 }]}
        />

        <Pressable
          onPress={async () => {
            const f = await pickInvoiceFile();
            if (f) setRwInvFile(f);
          }}
          style={[s.smallBtn, { marginTop: 10 }]}
        >
          <Text style={{ color: D.text, fontWeight: "900" }}>
            {rwInvUploadedName
              ? `Счёт прикреплён: ${rwInvUploadedName}`
              : "Прикрепить счёт"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <WideActionButton
          label="Сохранить"
          variant="blue"
          disabled={rwBusy}
          onPress={rwSaveItems}
        />

        <WideActionButton
          label="Директору"
          variant="green"
          disabled={rwBusy}
          onPress={rwSendToDirector}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <WideActionButton
          label="Бухгалтеру"
          variant="green"
          disabled={rwBusy}
          onPress={rwSendToAccounting}
        />

        <WideActionButton
          label="Закрыть"
          variant="neutral"
          disabled={rwBusy}
          onPress={closeSheet}
        />
      </View>
    </ScrollView>
  );
}
export function SheetFooterActions({
  s,
  left,
  center,
  right,
}: {
  s: StylesBag;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.reqActionsBottom}>
      <View style={{ width: 52, height: 52 }}>{left ?? null}</View>

      <View style={{ width: 8 }} />

      <View style={{ flex: 1, minWidth: 0 }}>{center ?? null}</View>

      <View style={{ width: 8 }} />

      <View style={{ width: 52, height: 52 }}>{right ?? null}</View>
    </View>
  );
}

export function BuyerAttachmentsSticky({
  s,
  creating,
  kbOpen,

  needAttachWarn,
  showAttachBlock,
  setShowAttachBlock,

  requiredSuppliers,
  missingAttachSuppliers,
  attachMissingCount,
  attachFilledCount,
  attachSlotsTotal,

  pickedIdsLen,

  attachments,
  setAttachments,
}: {
  s: StylesBag;
  creating: boolean;
  kbOpen: boolean;

  needAttachWarn: boolean;
  showAttachBlock: boolean;
  setShowAttachBlock: (v: boolean | ((prev: boolean) => boolean)) => void;

  requiredSuppliers: string[];
  missingAttachSuppliers: string[];
  attachMissingCount: number;
  attachFilledCount: number;
  attachSlotsTotal: number;

  pickedIdsLen: number;

  attachments: DraftAttachmentMap;
  setAttachments: (updater: DraftAttachmentMap | ((prev: DraftAttachmentMap) => DraftAttachmentMap)) => void;
}) {
  const warn = needAttachWarn;

  return (
    <View style={{ backgroundColor: D.cardBg, paddingTop: 6, paddingBottom: 8 }}>
      <Pressable
        onPress={() => {
          if (kbOpen) return;
          if (warn) setShowAttachBlock(true);
          else setShowAttachBlock((v) => !v);
        }}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          },
          warn && {
            borderColor: "rgba(239,68,68,0.55)",
            backgroundColor: "rgba(239,68,68,0.08)",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <Text style={{ fontWeight: "900", color: UI.text }} numberOfLines={1}>
            Вложения (для директора)
          </Text>

          {warn ? (
            <View style={s.warnPill}>
              <View style={s.warnDot} />
              <Text style={s.warnPillText}>нет: {attachMissingCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontWeight: "900", color: warn ? "#FCA5A5" : UI.sub }}>
          {attachFilledCount}/{attachSlotsTotal} {showAttachBlock ? "▲" : "▼"}
        </Text>
      </Pressable>

      {showAttachBlock && !kbOpen ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {requiredSuppliers.map((label) => {
            const k = normName(label) || SUPP_NONE;
            const rowWarn = pickedIdsLen > 0 && !attachments?.[k]?.file;

            return (
              <View
                key={k}
                style={[
                  { borderRadius: 14, padding: 2 },
                  rowWarn && {
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.55)",
                    backgroundColor: "rgba(239,68,68,0.06)",
                  },
                ]}
              >
                <AttachmentUploaderAny
                  s={s}
                  label={label}
                  disabled={creating}
                  current={attachments?.[k]}
                  onPick={(att) => {
                    setAttachments((prev) => {
                      const next = { ...prev };
                      if (att) next[k] = att;
                      else delete next[k];
                      return next;
                    });
                  }}
                />
              </View>
            );
          })}

          {warn ? (
            <Text style={{ marginTop: 6, color: "#FCA5A5", fontWeight: "900" }} numberOfLines={2}>
              Нет вложений для: {missingAttachSuppliers.slice(0, 3).join(", ")}
              {missingAttachSuppliers.length > 3 ? " …" : ""}
            </Text>
          ) : (
            <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }} numberOfLines={2}>
              Файлы прикрепятся к предложениям соответствующих поставщиков.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
