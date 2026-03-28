import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";

import type { ProposalViewLine, ProposalHeadLite } from "../buyer.types";
import { D, UI } from "../buyerUi";
import { FlashList } from "../../../ui/FlashList";
import type { StylesBag } from "./component.types";
import {
  buildProposalAnalyticSummary,
  loadProposalAnalyticInsights,
  type ProposalAnalyticInsight,
} from "../../../features/ai/aiAnalyticInsights";
import { isMarketplaceSourceValue } from "../../../features/market/market.contracts";
import SectionBlock from "../../../ui/SectionBlock";

type ProposalAttachmentLite = {
  id?: string | number | null;
  file_name?: string | null;
  created_at?: string | null;
};

// We extend head to support items_cnt and sent_to_accountant_at
type FullHead = ProposalHeadLite & { items_cnt?: number };

const isMarketplaceProposalLine = (line: ProposalViewLine | null | undefined) =>
  isMarketplaceSourceValue({
    appCode: line?.app_code,
    note: line?.note,
  });

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
  const [analyticInsights, setAnalyticInsights] = React.useState<ProposalAnalyticInsight[]>([]);
  const [analyticInsightsLoading, setAnalyticInsightsLoading] = React.useState(false);
  const analyticSummary = React.useMemo(
    () => buildProposalAnalyticSummary(analyticInsights),
    [analyticInsights],
  );

  const analyticSourceItems = React.useMemo(
    () => (propViewLines || []).map((line, index) => ({
      id: `${String(line?.request_item_id ?? "x")}:${index}`,
      rikCode: line?.rik_code ?? null,
      name: line?.name_human ?? null,
      price: line?.price ?? null,
      supplier: line?.supplier ?? null,
    })),
    [propViewLines],
  );

  React.useEffect(() => {
    let cancelled = false;

    if (!analyticSourceItems.length) {
      setAnalyticInsights([]);
      setAnalyticInsightsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setAnalyticInsightsLoading(true);
    void loadProposalAnalyticInsights(analyticSourceItems)
      .then((nextInsights) => {
        if (!cancelled) setAnalyticInsights(nextInsights);
      })
      .catch(() => {
        if (!cancelled) setAnalyticInsights([]);
      })
      .finally(() => {
        if (!cancelled) setAnalyticInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analyticSourceItems]);

  if (propViewBusy) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
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
        paddingVertical: 14,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
        backgroundColor: "rgba(255,255,255,0.02)"
      }}>
        {onOpenPdf && pidStr && (
          <Pressable
            onPress={() => onOpenPdf(pidStr)}
            style={[s.smallBtn, { flex: 1, height: 44, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }]}
          >
            <Text style={{ color: D.text, fontWeight: "900", fontSize: 13 }}>📄 PDF</Text>
          </Pressable>
        )}

        {head?.status === "Утверждено" && !head.sent_to_accountant_at && onOpenAccounting && pidStr && (
          <Pressable
            onPress={() => onOpenAccounting(pidStr)}
            style={[s.smallBtn, { flex: 1.5, height: 44, backgroundColor: UI.accent, borderColor: UI.accent }]}
          >
            <Text style={{ color: "#000", fontWeight: "900", fontSize: 13 }}>В бухгалтерию</Text>
          </Pressable>
        )}

        {String(head?.status).startsWith("На доработке") && onOpenRework && pidStr && (
          <Pressable
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, { flex: 1.5, height: 44, backgroundColor: "#f97316", borderColor: "#f97316" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>Доработать</Text>
          </Pressable>
        )}
      </View>

      <FlashList
        data={propViewLines}
        keyExtractor={(ln, idx) => `${String(ln?.request_item_id ?? "x")}:${idx}`}
        estimatedItemSize={148}
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
              const marketplaceSourceVisible = (propViewLines || []).some((x) => isMarketplaceProposalLine(x));

              if (!ctxLines.length && !supplier && !marketplaceSourceVisible) return null;

              return (
                <View style={[s.reqNoteBox, { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                  {marketplaceSourceVisible ? (
                    <Text style={[s.reqNoteLine, { fontSize: 13, color: UI.accent, fontWeight: "900" }]} numberOfLines={1}>
                      Источник: Маркетплейс
                    </Text>
                  ) : null}
                  {ctxLines.map((t, idx) => (
                    <Text key={idx} style={[s.reqNoteLine, { fontSize: 13, color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                      {t}
                    </Text>
                  ))}
                  {supplier ? (
                    <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                      <Text style={[s.reqNoteLine, { fontWeight: "900", color: UI.accent }]} numberOfLines={1}>
                        Поставщик: {supplier}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })()}

            {analyticInsightsLoading || analyticInsights.length ? (
              <SectionBlock style={{ marginBottom: 12 }} contentStyle={{ gap: 10 }}>
                <Text style={{ fontWeight: "900", color: D.text, fontSize: 16 }}>AI аналитика</Text>
                {analyticSummary ? (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor:
                        analyticSummary.tone === "good"
                          ? "rgba(34,197,94,0.35)"
                          : analyticSummary.tone === "expensive"
                            ? "rgba(249,115,22,0.35)"
                            : analyticSummary.tone === "average"
                              ? "rgba(56,189,248,0.35)"
                              : "rgba(255,255,255,0.08)",
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: D.text, fontWeight: "900", fontSize: 13 }}>
                      {analyticSummary.headline}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 17 }}>
                      {analyticSummary.text}
                    </Text>
                  </View>
                ) : null}
                {analyticInsightsLoading ? (
                  <View style={{ paddingVertical: 8, alignItems: "center" }}>
                    <ActivityIndicator color={UI.accent} />
                  </View>
                ) : (
                  analyticInsights.map((insight) => (
                    <View
                      key={insight.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.08)",
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: D.text, fontWeight: "900", fontSize: 13 }} numberOfLines={2}>
                        {insight.name}
                      </Text>
                      <Text
                        style={{
                          color:
                            insight.priceInsightTone === "good"
                              ? "#22C55E"
                              : insight.priceInsightTone === "expensive"
                                ? "#F97316"
                                : insight.priceInsightTone === "average"
                                  ? UI.accent
                                  : D.sub,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        {insight.priceInsightLabel}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 17 }}>
                        {insight.priceInsightText}
                      </Text>
                      {insight.supplierInsightText ? (
                        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 17 }}>
                          {insight.supplierInsightText}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SectionBlock>
            ) : null}

            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontWeight: "900", color: D.text, flex: 1, fontSize: 16 }}>Вложения</Text>

                <Pressable
                  onPress={onReloadAttachments}
                  disabled={propAttBusy}
                  style={[s.smallBtn, { height: 32, paddingVertical: 0, paddingHorizontal: 10, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)" }]}
                >
                  <Text style={{ color: D.text, fontWeight: "900", fontSize: 11 }}>{propAttBusy ? "..." : "Обновить"}</Text>
                </Pressable>

                <Pressable
                  onPress={onAttachFile}
                  disabled={propAttBusy}
                  style={[s.smallBtn, { height: 32, paddingVertical: 0, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}
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
                <View style={{ marginTop: 10, gap: 8 }}>
                  {attachments.slice(0, 10).map((a, idx: number) => (
                    <Pressable
                      key={a?.id ?? `${a?.file_name ?? "f"}:${idx}`}
                      onPress={() => onOpenAttachment(a)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>📄</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: D.text, fontWeight: "900", fontSize: 13 }} numberOfLines={1}>
                          {String(a?.file_name ?? "Файл")}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={{ marginTop: 8, color: D.sub, fontWeight: "800", fontSize: 13 }}>Пока нет вложений</Text>
              )}
            </View>

            <SectionBlock style={{ marginTop: 12, marginBottom: 8 }} contentStyle={{ gap: 0 }}>
              <Text style={{ fontWeight: "900", color: D.text, fontSize: 16 }}>Состав</Text>
            </SectionBlock>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: ln }) => {
          const noteRaw = String(ln?.note ?? "").trim();
          const hideNote = isReqContextNote(noteRaw) || isMarketplaceProposalLine(ln);

          return (
            <View style={[s.dirMobCard, { marginHorizontal: 16, padding: 14 }]}>
              <View style={s.dirMobMain}>
                <Text style={[s.dirMobTitle, { color: D.text, fontSize: 15 }]} numberOfLines={3}>
                  {ln?.name_human || ln?.rik_code || `Позиция ${String(ln?.request_item_id || "").slice(0, 6)}`}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <Text style={[s.dirMobMeta, { color: UI.accent, fontSize: 14, fontWeight: "900" }]}>
                    {Number(ln?.qty ?? 0)} {ln?.uom ?? ""}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.2)" }}>•</Text>
                  <Text style={[s.dirMobMeta, { color: D.text, fontSize: 14, fontWeight: "800" }]}>
                    {ln?.price != null ? `${Number(ln.price).toLocaleString()} сом` : "Цена не указана"}
                  </Text>
                </View>

                {!hideNote && noteRaw ? (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <Text style={[s.dirMobNote, { color: 'rgba(255,255,255,0.7)', fontSize: 12 }]} numberOfLines={2}>
                      {noteRaw}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
