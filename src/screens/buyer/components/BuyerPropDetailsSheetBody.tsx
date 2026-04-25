import React from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import type { ProposalViewLine, ProposalHeadLite } from "../buyer.types";
import { D, UI } from "../buyerUi";
import { FlashList } from "../../../ui/FlashList";
import type { StylesBag } from "./component.types";
import {
  buildProposalAnalyticSummary,
  loadProposalAnalyticInsights,
  type ProposalAnalyticInsight,
} from "../../../features/ai/aiAnalyticInsights";
import {
  getProposalIntegritySummaryLabel,
  getProposalItemIntegrityLabel,
} from "../../../lib/api/proposalIntegrity";
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

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  actionButton: {
    height: 44,
  },
  actionButtonText: {
    fontWeight: "900",
    fontSize: 13,
  },
  listHeader: {
    padding: 16,
  },
  supplierDivider: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  integritySummaryCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  integritySummaryText: {
    color: "#FDBA74",
    fontWeight: "900",
    fontSize: 12,
  },
  analyticsSection: {
    marginBottom: 12,
  },
  analyticsSectionContent: {
    gap: 10,
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 16,
  },
  analyticsSummaryCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    gap: 6,
  },
  analyticsHeadline: {
    fontWeight: "900",
    fontSize: 13,
  },
  analyticsText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 17,
  },
  analyticsLoading: {
    paddingVertical: 8,
    alignItems: "center",
  },
  analyticsInsightCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  analyticsInsightTitle: {
    fontWeight: "900",
    fontSize: 13,
  },
  analyticsInsightToneLabel: {
    fontWeight: "900",
    fontSize: 12,
  },
  analyticsInsightBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 17,
  },
  analyticsInsightSubBody: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    lineHeight: 17,
  },
  attachmentsSection: {
    marginBottom: 12,
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentsTitle: {
    flex: 1,
    fontWeight: "900",
    fontSize: 16,
  },
  attachmentsMiniAction: {
    height: 32,
    paddingVertical: 0,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  attachmentsMiniActionText: {
    fontWeight: "900",
    fontSize: 11,
  },
  attachmentsErrorText: {
    marginTop: 6,
    color: "#FCA5A5",
    fontWeight: "900",
    fontSize: 12,
  },
  attachmentsList: {
    marginTop: 10,
    gap: 8,
  },
  attachmentCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentIcon: {
    fontSize: 16,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontWeight: "900",
    fontSize: 13,
  },
  attachmentsEmpty: {
    marginTop: 8,
    fontWeight: "800",
    fontSize: 13,
  },
  compositionSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  compositionSectionContent: {
    gap: 0,
  },
  lineCard: {
    marginHorizontal: 16,
    padding: 14,
  },
  lineIntegrityBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(249,115,22,0.14)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  lineIntegrityBadgeText: {
    color: "#FDBA74",
    fontWeight: "900",
    fontSize: 11,
  },
  lineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  lineMetaBullet: {
    color: "rgba(255,255,255,0.2)",
  },
  lineNoteBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
  },
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
  const integritySummary = React.useMemo(
    () => getProposalIntegritySummaryLabel(propViewLines),
    [propViewLines],
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={UI.accent} />
      </View>
    );
  }

  const pidStr = head?.id ? String(head.id) : "";

  return (
    <View style={styles.root}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        {onOpenPdf && pidStr && (
          <Pressable
            testID="buyer-proposal-pdf"
            accessibilityLabel="buyer-proposal-pdf"
            onPress={() => onOpenPdf(pidStr)}
            style={[
              s.smallBtn,
              styles.actionButton,
              { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: D.text }]}>📄 PDF</Text>
          </Pressable>
        )}

        {head?.status === "Утверждено" && !head.sent_to_accountant_at && onOpenAccounting && pidStr && (
          <Pressable
            testID="buyer-proposal-accounting"
            accessibilityLabel="buyer-proposal-accounting"
            onPress={() => onOpenAccounting(pidStr)}
            style={[s.smallBtn, styles.actionButton, { flex: 1.5, backgroundColor: UI.accent, borderColor: UI.accent }]}
          >
            <Text style={[styles.actionButtonText, { color: "#000" }]}>В бухгалтерию</Text>
          </Pressable>
        )}

        {String(head?.status).startsWith("На доработке") && onOpenRework && pidStr && (
          <Pressable
            testID="buyer-proposal-rework"
            accessibilityLabel="buyer-proposal-rework"
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, styles.actionButton, { flex: 1.5, backgroundColor: "#f97316", borderColor: "#f97316" }]}
          >
            <Text style={[styles.actionButtonText, { color: "#fff" }]}>Доработать</Text>
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
          <View style={styles.listHeader}>
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
                    <View style={styles.supplierDivider}>
                      <Text style={[s.reqNoteLine, { fontWeight: "900", color: UI.accent }]} numberOfLines={1}>
                        Поставщик: {supplier}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })()}

            {integritySummary ? (
              <View style={styles.integritySummaryCard}>
                <Text style={styles.integritySummaryText}>
                  {integritySummary}
                </Text>
              </View>
            ) : null}

            {analyticInsightsLoading || analyticInsights.length ? (
              <SectionBlock style={styles.analyticsSection} contentStyle={styles.analyticsSectionContent}>
                <Text style={[styles.sectionTitle, { color: D.text }]}>AI аналитика</Text>
                {analyticSummary ? (
                  <View
                    style={[
                      styles.analyticsSummaryCard,
                      {
                        borderColor:
                          analyticSummary.tone === "good"
                            ? "rgba(34,197,94,0.35)"
                            : analyticSummary.tone === "expensive"
                              ? "rgba(249,115,22,0.35)"
                              : analyticSummary.tone === "average"
                                ? "rgba(56,189,248,0.35)"
                                : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Text style={[styles.analyticsHeadline, { color: D.text }]}>
                      {analyticSummary.headline}
                    </Text>
                    <Text style={styles.analyticsText}>
                      {analyticSummary.text}
                    </Text>
                  </View>
                ) : null}
                {analyticInsightsLoading ? (
                  <View style={styles.analyticsLoading}>
                    <ActivityIndicator color={UI.accent} />
                  </View>
                ) : (
                  analyticInsights.map((insight) => (
                    <View
                      key={insight.id}
                      style={styles.analyticsInsightCard}
                    >
                      <Text style={[styles.analyticsInsightTitle, { color: D.text }]} numberOfLines={2}>
                        {insight.name}
                      </Text>
                      <Text
                        style={[
                          styles.analyticsInsightToneLabel,
                          {
                            color:
                              insight.priceInsightTone === "good"
                                ? "#22C55E"
                                : insight.priceInsightTone === "expensive"
                                  ? "#F97316"
                                  : insight.priceInsightTone === "average"
                                    ? UI.accent
                                    : D.sub,
                          },
                        ]}
                      >
                        {insight.priceInsightLabel}
                      </Text>
                      <Text style={styles.analyticsInsightBody}>
                        {insight.priceInsightText}
                      </Text>
                      {insight.supplierInsightText ? (
                        <Text style={styles.analyticsInsightSubBody}>
                          {insight.supplierInsightText}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SectionBlock>
            ) : null}

            <View style={styles.attachmentsSection}>
              <View style={styles.attachmentsHeader}>
                <Text style={[styles.attachmentsTitle, { color: D.text }]}>Вложения</Text>

                <Pressable
                  onPress={onReloadAttachments}
                  disabled={propAttBusy}
                  style={[s.smallBtn, styles.attachmentsMiniAction]}
                >
                  <Text style={[styles.attachmentsMiniActionText, { color: D.text }]}>
                    {propAttBusy ? "..." : "Обновить"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onAttachFile}
                  disabled={propAttBusy}
                  style={[s.smallBtn, styles.attachmentsMiniAction]}
                >
                  <Text style={[styles.attachmentsMiniActionText, { color: D.text }]}>+ Файл</Text>
                </Pressable>
              </View>

              {!!propAttErr ? (
                <Text style={styles.attachmentsErrorText} numberOfLines={2}>
                  {propAttErr}
                </Text>
              ) : null}

              {attachments?.length ? (
                <View style={styles.attachmentsList}>
                  {attachments.slice(0, 10).map((a, idx: number) => (
                    <Pressable
                      key={a?.id ?? `${a?.file_name ?? "f"}:${idx}`}
                      onPress={() => onOpenAttachment(a)}
                      style={styles.attachmentCard}
                    >
                      <Text style={styles.attachmentIcon}>📄</Text>
                      <View style={styles.attachmentMeta}>
                        <Text style={[styles.attachmentName, { color: D.text }]} numberOfLines={1}>
                          {String(a?.file_name ?? "Файл")}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={[styles.attachmentsEmpty, { color: D.sub }]}>Пока нет вложений</Text>
              )}
            </View>

            <SectionBlock style={styles.compositionSection} contentStyle={styles.compositionSectionContent}>
              <Text style={[styles.sectionTitle, { color: D.text }]}>Состав</Text>
            </SectionBlock>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: ln }) => {
          const noteRaw = String(ln?.note ?? "").trim();
          const hideNote = isReqContextNote(noteRaw) || isMarketplaceProposalLine(ln);
          const integrityLabel = getProposalItemIntegrityLabel(ln);

          return (
            <View style={[s.dirMobCard, styles.lineCard]}>
              <View style={s.dirMobMain}>
                <Text style={[s.dirMobTitle, { color: D.text, fontSize: 15 }]} numberOfLines={3}>
                  {ln?.name_human || ln?.rik_code || `Позиция ${String(ln?.request_item_id || "").slice(0, 6)}`}
                </Text>

                {integrityLabel ? (
                  <View style={styles.lineIntegrityBadge}>
                    <Text style={styles.lineIntegrityBadgeText}>
                      {integrityLabel}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.lineMetaRow}>
                  <Text style={[s.dirMobMeta, { color: UI.accent, fontSize: 14, fontWeight: "900" }]}>
                    {Number(ln?.qty ?? 0)} {ln?.uom ?? ""}
                  </Text>
                  <Text style={styles.lineMetaBullet}>•</Text>
                  <Text style={[s.dirMobMeta, { color: D.text, fontSize: 14, fontWeight: "800" }]}>
                    {ln?.price != null ? `${Number(ln.price).toLocaleString()} сом` : "Цена не указана"}
                  </Text>
                </View>

                {!hideNote && noteRaw ? (
                  <View style={styles.lineNoteBox}>
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
