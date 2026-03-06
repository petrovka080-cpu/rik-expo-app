import React from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";

import type { ProposalViewLine } from "../buyer.types";
import { D } from "../buyerUi";
import type { StylesBag } from "./component.types";

type ProposalAttachmentLite = {
  id?: string | number | null;
  file_name?: string | null;
  created_at?: string | null;
};

export function BuyerPropDetailsSheetBody({
  s,
  propViewBusy,
  propViewLines,
  isReqContextNote,
  extractReqContextLines,
  propAttBusy,
  propAttErr,
  attachments,
  onReloadAttachments,
  onAttachFile,
  onOpenAttachment,
}: {
  s: StylesBag;
  propViewBusy: boolean;
  propViewLines: ProposalViewLine[];
  isReqContextNote: (raw: string) => boolean;
  extractReqContextLines: (raw: string, limit?: number) => string[];
  propAttBusy: boolean;
  propAttErr: string;
  attachments: ProposalAttachmentLite[];
  onReloadAttachments: () => void;
  onAttachFile: () => void;
  onOpenAttachment: (att: ProposalAttachmentLite) => void;
}) {
  if (propViewBusy) {
    return (
      <View style={{ padding: 18 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!propViewLines?.length) {
    return <Text style={{ color: D.sub, padding: 16, fontWeight: "800" }}>Позиции не найдены</Text>;
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {(() => {
        const anyLine = (propViewLines || []).find((x) => !!x?.note);
        const raw = String(anyLine?.note ?? "").trim();

        const ctxLines = raw && isReqContextNote(raw) ? extractReqContextLines(raw, 5) : [];
        const supplier = String((propViewLines || []).find((x) => x?.supplier)?.supplier ?? "").trim();

        if (!ctxLines.length && !supplier) return null;

        return (
          <View style={[s.reqNoteBox, { marginTop: 6, marginBottom: 12 }]}>
            {ctxLines.map((t, idx) => (
              <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                {t}
              </Text>
            ))}

            {supplier ? (
              <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
                Поставщик: {supplier}
              </Text>
            ) : null}
          </View>
        );
      })()}

      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontWeight: "900", color: D.text, flex: 1 }}>Вложения</Text>

          <Pressable
            onPress={onReloadAttachments}
            disabled={propAttBusy}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
            ]}
          >
            <Text style={{ color: D.text, fontWeight: "900" }}>{propAttBusy ? "..." : "Обновить"}</Text>
          </Pressable>

          <Pressable
            onPress={onAttachFile}
            disabled={propAttBusy}
            style={[s.smallBtn, { backgroundColor: "#2563eb", borderColor: "#2563eb" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>+ Файл</Text>
          </Pressable>
        </View>

        {!!propAttErr ? (
          <Text style={{ marginTop: 6, color: "#FCA5A5", fontWeight: "900" }} numberOfLines={2}>
            {propAttErr}
          </Text>
        ) : null}

        {attachments?.length ? (
          <View style={{ marginTop: 8, gap: 6 }}>
            {attachments.slice(0, 10).map((a, idx: number) => (
              <Pressable
                key={a?.id ?? `${a?.file_name ?? "f"}:${idx}`}
                onPress={() => onOpenAttachment(a)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: D.text, fontWeight: "900" }} numberOfLines={1}>
                  {String(a?.file_name ?? "Файл")}
                </Text>

                <Text style={{ color: D.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
                  {a?.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ marginTop: 8, color: D.sub, fontWeight: "800" }}>Пока нет вложений</Text>
        )}
      </View>

      <FlatList
        data={propViewLines}
        keyExtractor={(ln, idx) => `${String(ln?.request_item_id ?? "x")}:${idx}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item: ln }) => {
          const noteRaw = String(ln?.note ?? "").trim();
          const hideNote = isReqContextNote(noteRaw);

          return (
            <View style={s.dirMobCard}>
              <View style={s.dirMobMain}>
                <Text style={[s.dirMobTitle, { color: D.text }]} numberOfLines={3}>
                  {ln?.name_human || ln?.rik_code || `Позиция ${String(ln?.request_item_id || "").slice(0, 6)}`}
                </Text>

                <Text style={[s.dirMobMeta, { color: D.sub }]} numberOfLines={2}>
                  {`${Number(ln?.qty ?? 0)} ${ln?.uom ?? ""}`.trim()}
                  {` · Цена: ${ln?.price ?? "—"}`}
                </Text>

                {!hideNote && noteRaw ? (
                  <Text style={[s.dirMobNote, { color: D.text }]} numberOfLines={3}>
                    Прим.: {noteRaw}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

