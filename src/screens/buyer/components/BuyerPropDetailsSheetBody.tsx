import React from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";

import type { ProposalViewLine, ProposalHeadLite } from "../buyer.types";
import { D, UI } from "../buyerUi";
import type { StylesBag } from "./component.types";

type ProposalAttachmentLite = {
  id?: string | number | null;
  file_name?: string | null;
  created_at?: string | null;
};

// We extend head to support items_cnt and sent_to_accountant_at
type FullHead = ProposalHeadLite & { items_cnt?: number };

export function BuyerPropDetailsSheetBody({
  s,
  head,
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
  onOpenPdf,
  onOpenAccounting,
  onOpenRework,
}: {
  s: StylesBag;
  head: FullHead | null;
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
  onOpenPdf?: (pid: string) => void;
  onOpenAccounting?: (pid: string) => void;
  onOpenRework?: (pid: string) => void;
}) {
  if (propViewBusy) {
    return (
      <View style={{ padding: 18, alignItems: "center" }}>
        <ActivityIndicator color={UI.accent} />
      </View>
    );
  }

  const pidStr = head?.id ? String(head.id) : "";

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* Action Bar */}
      <View style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.02)"
      }}>
        {onOpenPdf && pidStr && (
          <Pressable
            onPress={() => onOpenPdf(pidStr)}
            style={[s.smallBtn, { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)" }]}
          >
            <Text style={{ color: D.text, fontWeight: "900", fontSize: 13 }}>📄 PDF</Text>
          </Pressable>
        )}

        {head?.status === "Утверждено" && !head.sent_to_accountant_at && onOpenAccounting && pidStr && (
          <Pressable
            onPress={() => onOpenAccounting(pidStr)}
            style={[s.smallBtn, { flex: 1.5, backgroundColor: "#2563eb", borderColor: "#2563eb" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>В бухгалтерию</Text>
          </Pressable>
        )}

        {String(head?.status).startsWith("На доработке") && onOpenRework && pidStr && (
          <Pressable
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, { flex: 1.5, backgroundColor: "#f97316", borderColor: "#f97316" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>Доработать</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={propViewLines}
        keyExtractor={(ln, idx) => `${String(ln?.request_item_id ?? "x")}:${idx}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            {(() => {
              const anyLine = (propViewLines || []).find((x) => !!x?.note);
              const raw = String(anyLine?.note ?? "").trim();
              const ctxLines = raw && isReqContextNote(raw) ? extractReqContextLines(raw, 5) : [];
              const supplier = String((propViewLines || []).find((x) => x?.supplier)?.supplier ?? "").trim();

              if (!ctxLines.length && !supplier) return null;

              return (
                <View style={[s.reqNoteBox, { marginBottom: 16 }]}>
                  {ctxLines.map((t, idx) => (
                    <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                      {t}
                    </Text>
                  ))}
                  {supplier ? (
                    <Text style={[s.reqNoteLine, { fontWeight: "900", marginTop: 4 }]} numberOfLines={1}>
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
                  style={[s.smallBtn, { height: 32, paddingVertical: 0, paddingHorizontal: 12, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" }]}
                >
                  <Text style={{ color: D.text, fontWeight: "900", fontSize: 11 }}>{propAttBusy ? "..." : "Обновить"}</Text>
                </Pressable>

                <Pressable
                  onPress={onAttachFile}
                  disabled={propAttBusy}
                  style={[s.smallBtn, { height: 32, paddingVertical: 0, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" }]}
                >
                  <Text style={{ color: D.text, fontWeight: "900", fontSize: 11 }}>+ Файл</Text>
                </Pressable>
              </View>

              {!!propAttErr ? (
                <Text style={{ marginTop: 6, color: "#FCA5A5", fontWeight: "900", fontSize: 12 }} numberOfLines={2}>
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
                      <Text style={{ color: D.sub, fontWeight: "800", fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                        {a?.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={{ marginTop: 8, color: D.sub, fontWeight: "800", fontSize: 13 }}>Пока нет вложений</Text>
              )}
            </View>

            <Text style={{ fontWeight: "900", color: D.text, marginBottom: 8 }}>Состав</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item: ln }) => {
          const noteRaw = String(ln?.note ?? "").trim();
          const hideNote = isReqContextNote(noteRaw);

          return (
            <View style={[s.dirMobCard, { marginHorizontal: 16 }]}>
              <View style={s.dirMobMain}>
                <Text style={[s.dirMobTitle, { color: D.text }]} numberOfLines={3}>
                  {ln?.name_human || ln?.rik_code || `Позиция ${String(ln?.request_item_id || "").slice(0, 6)}`}
                </Text>

                <Text style={[s.dirMobMeta, { color: D.sub, marginTop: 4 }]} numberOfLines={2}>
                  {`${Number(ln?.qty ?? 0)} ${ln?.uom ?? ""}`.trim()}
                  {ln?.price != null ? ` · Цена: ${ln.price}` : ""}
                </Text>

                {!hideNote && noteRaw ? (
                  <Text style={[s.dirMobNote, { color: D.text, marginTop: 4, fontStyle: "italic" }]} numberOfLines={3}>
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
