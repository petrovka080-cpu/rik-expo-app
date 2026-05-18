import React from "react";
import { Pressable, Text, View } from "react-native";

import type { DraftAttachmentMap } from "../buyer.types";
import { D, UI } from "../buyerUi";
import { normName, SUPP_NONE } from "../buyerUtils";
import { AttachmentUploaderAny } from "./AttachmentUploaderAny";
import type { StylesBag } from "./component.types";

function BuyerAttachmentsStickyInner({
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
            const current = attachments?.[k];
            const fileName = String(current?.name || "").trim();

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
                  current={current}
                  onPick={(att) => {
                    setAttachments((prev) => {
                      const next = { ...prev };
                      if (att) next[k] = att;
                      else delete next[k];
                      return next;
                    });
                  }}
                />
                <Text
                  style={{
                    marginTop: 6,
                    color: rowWarn ? "#FCA5A5" : UI.sub,
                    fontWeight: rowWarn ? "900" : "700",
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {rowWarn
                    ? `Не выбраны вложения для: ${label}`
                    : `Вложение прикреплено: ${fileName || "файл"}`}
                </Text>
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

export const BuyerAttachmentsSticky = React.memo(BuyerAttachmentsStickyInner);
