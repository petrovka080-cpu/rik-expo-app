import React from "react";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import DeleteAllButton from "../../ui/DeleteAllButton";
import RejectItemButton from "../../ui/RejectItemButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import DirectorProposalRiskSummaryCard from "../../components/director/DirectorProposalRiskSummaryCard";
import {
  getProposalIntegritySummaryLabel,
  getProposalItemIntegrityLabel,
} from "../../lib/api/proposalIntegrity";
import {
  buildProposalAnalyticSummary,
  loadProposalAnalyticInsights,
  type ProposalAnalyticInsight,
} from "../../features/ai/aiAnalyticInsights";
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
  attError: string;
  reqItemNoteById: Record<string, string>;
  propReqIds: string[];
  reqMetaById: Record<string, RequestMeta>;
  isPdfBusy: boolean;
  onRefreshAttachments: () => void;
  onOpenAttachment: (file: ProposalAttachmentRow) => void;
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
  attError,
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
  const [analyticInsights, setAnalyticInsights] = React.useState<ProposalAnalyticInsight[]>([]);
  const [analyticInsightsLoading, setAnalyticInsightsLoading] = React.useState(false);
  const [footerHeight, setFooterHeight] = React.useState(0);
  const analyticSummary = React.useMemo(
    () => buildProposalAnalyticSummary(analyticInsights),
    [analyticInsights],
  );
  const bodyBottomInset = Math.max(footerHeight + 12, 24);
  const integritySummary = React.useMemo(
    () => getProposalIntegritySummaryLabel(items),
    [items],
  );
  const riskSummaryContext = React.useMemo(
    () => ({
      proposalId: pidStr,
      status: approveDisabled ? "decision_blocked_or_not_ready" : "pending_director_review",
      totalSum,
      itemCount: items.length,
      attachmentsCount: files.length,
      integritySummary,
      items: items.map((item) => ({
        id: item.id,
        name: item.name_human ?? null,
        supplier: null,
        qty: item.total_qty ?? null,
        uom: item.uom ?? null,
        price: item.price ?? null,
        appCode: item.app_code ?? item.rik_code ?? null,
      })),
    }),
    [approveDisabled, files.length, integritySummary, items, pidStr, totalSum],
  );

  const analyticSourceItems = React.useMemo(
    () =>
      items.map((item) => ({
        id: `director:${pidStr}:${item.id}`,
        rikCode: item.rik_code ?? null,
        name: item.name_human ?? null,
        price: item.price ?? null,
        supplier: null,
      })),
    [items, pidStr],
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

  if (!loaded) {
    return <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>;
  }
  if (!items.length) {
    return <Text style={{ opacity: 0.75, color: UI.sub }}>Состав пуст — утвердить нельзя</Text>;
  }

  const listHeader = (
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
        error={attError}
        onRefresh={onRefreshAttachments}
        onOpenAttachment={onOpenAttachment}
      />

      <DirectorProposalRiskSummaryCard context={riskSummaryContext} />

      {integritySummary ? (
        <View
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "rgba(249,115,22,0.12)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.35)",
          }}
        >
          <Text style={{ color: "#FDBA74", fontWeight: "900", fontSize: 12 }}>
            {integritySummary}
          </Text>
        </View>
      ) : null}

      {analyticInsightsLoading || analyticInsights.length ? (
        <View
          style={{
            marginBottom: 12,
            padding: 14,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            gap: 10,
          }}
        >
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 15 }}>AI аналитика</Text>
          {analyticSummary ? (
            <View
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
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
              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 13 }}>
                {analyticSummary.headline}
              </Text>
              <Text style={{ color: UI.sub, fontSize: 12, lineHeight: 17 }}>
                {analyticSummary.text}
              </Text>
            </View>
          ) : null}
          {analyticInsightsLoading ? (
            <Text style={{ color: UI.sub }}>Загружаю read-only срез по цене и поставщикам…</Text>
          ) : (
            analyticInsights.map((insight) => (
              <View
                key={insight.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  gap: 6,
                }}
              >
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 13 }} numberOfLines={2}>
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
                            ? "#38BDF8"
                            : UI.sub,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {insight.priceInsightLabel}
                </Text>
                <Text style={{ color: UI.sub, fontSize: 12, lineHeight: 17 }}>
                  {insight.priceInsightText}
                </Text>
                {insight.supplierInsightText ? (
                  <Text style={{ color: UI.sub, fontSize: 12, lineHeight: 17 }}>
                    {insight.supplierInsightText}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </>
  );

  return (
    <View testID={`director-proposal-sheet-${pidStr}`} style={s.sheetContent}>
      <View style={s.sheetScrollableBody}>
        <FlashList
          data={items}
          keyExtractor={(it, idx) => `pi:${pidStr}:${it.id}:${idx}`}
          estimatedItemSize={88}
          overrideItemLayout={(layout: { size?: number }) => {
            layout.size = 88;
          }}
          style={s.sheetScrollableBody}
          contentContainerStyle={{ paddingBottom: bodyBottomInset }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEnabled
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
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
                {getProposalItemIntegrityLabel(it) ? (
                  <View
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: "rgba(249,115,22,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.35)",
                    }}
                  >
                    <Text style={{ color: "#FDBA74", fontWeight: "900", fontSize: 11 }}>
                      {getProposalItemIntegrityLabel(it)}
                    </Text>
                  </View>
                ) : null}
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
        />
      </View>

      <View
        style={s.sheetFooter}
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height || 0);
          if (nextHeight > 0 && nextHeight !== footerHeight) {
            setFooterHeight(nextHeight);
          }
        }}
      >
        <View style={s.reqActionsBottom}>
          <View style={s.actionBtnSquare}>
            <DeleteAllButton
              disabled={screenLock || propReturnId === pidStr || propApproveId === pidStr}
              loading={propReturnId === pidStr}
              accessibilityLabel="Вернуть или отклонить"
              onPress={onReturn}
            />
          </View>

          <View style={s.sp8} />

          <Pressable
            disabled={isPdfBusy || screenLock}
            style={[
              s.actionBtnWide,
              { backgroundColor: UI.btnNeutral, opacity: isPdfBusy || screenLock ? 0.6 : 1 },
            ]}
            onPress={() => void onPdf()}
          >
            <Text style={s.actionText}>{isPdfBusy ? "PDF..." : "PDF"}</Text>
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
              testID={`director-proposal-approve-${pidStr}`}
              onPress={() => void onApprove()}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
