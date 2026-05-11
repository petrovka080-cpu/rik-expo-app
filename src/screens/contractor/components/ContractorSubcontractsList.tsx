import React from "react";
import { Pressable, RefreshControl, Text, View, type ListRenderItemInfo } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";
import { FlashList } from "../../../ui/FlashList";
import type { ContractorWorkCardModel } from "../contractor.cardModel";
import type { ContractorScreenContract } from "../contractor.visibilityRecovery";

type Props = {
  data: ContractorWorkCardModel[];
  screenContract: ContractorScreenContract;
  refreshing: boolean;
  loadingWorks: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  styles: any;
};

type ContractorWorkCardRowProps = {
  item: ContractorWorkCardModel;
  onOpen: (id: string) => void;
  styles: Props["styles"];
};

const STATUS_LABELS: Record<ContractorWorkCardModel["status"], string> = {
  approved: "APPROVED",
  in_progress: "ACTIVE",
  done: "DONE",
  unknown: "UNKNOWN",
};

const sourceBadgeTone = (sourceKind: ContractorWorkCardModel["sourceKind"]) =>
  sourceKind === "canonical"
    ? { bg: "rgba(34,197,94,0.14)", fg: "#86EFAC", label: "CANONICAL" }
    : { bg: "rgba(245,158,11,0.14)", fg: "#FCD34D", label: "DEGRADED" };

const statusBadgeTone = (status: ContractorWorkCardModel["status"]) => {
  switch (status) {
    case "done":
      return { bg: "rgba(34,197,94,0.14)", fg: "#86EFAC" };
    case "in_progress":
      return { bg: "rgba(59,130,246,0.14)", fg: "#93C5FD" };
    case "approved":
      return { bg: "rgba(168,85,247,0.14)", fg: "#D8B4FE" };
    default:
      return { bg: "rgba(148,163,184,0.14)", fg: "#CBD5E1" };
  }
};

const qualityBadgeTone = (qualityState: ContractorWorkCardModel["qualityState"]) =>
  qualityState === "degraded_title"
    ? { bg: "rgba(245,158,11,0.14)", fg: "#FCD34D", label: "TITLE DEGRADED" }
    : null;

const toCardToken = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const LIST_STYLE = { flex: 1, marginTop: 12 } as const;
const LIST_CONTENT_STYLE = { paddingHorizontal: 16, paddingBottom: 32 } as const;
const LIST_NOTICE_CARD_STYLE = { borderRadius: 18, padding: 16, marginBottom: 12 } as const;
const LIST_EMPTY_CARD_STYLE = { borderRadius: 18, padding: 20 } as const;
const CENTER_TEXT_STYLE = { textAlign: "center" } as const;
const CARD_BASE_STYLE = { borderRadius: 18, overflow: "hidden", padding: 14 } as const;
const CARD_CONTENT_STYLE = { flex: 1, minWidth: 0 } as const;
const BADGE_ROW_STYLE = { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 } as const;
const BADGE_STYLE = { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 } as const;
const BADGE_TEXT_STYLE = { fontSize: 11, fontWeight: "900" } as const;
const CONTRACTOR_TITLE_STYLE = { fontSize: 18, marginBottom: 4 } as const;
const CARD_WORK_STYLE = { fontWeight: "700", fontSize: 14 } as const;
const OBJECT_ROW_STYLE = { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 } as const;
const OBJECT_BADGE_STYLE = {
  backgroundColor: "rgba(59,130,246,0.15)",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
} as const;
const OBJECT_BADGE_TEXT_STYLE = { color: "#60A5FA", fontSize: 11, fontWeight: "900" } as const;
const OBJECT_TEXT_STYLE = { marginTop: 0, flex: 1 } as const;
const CONTRACTOR_SUBCONTRACTS_LIST_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

const contractorWorkCardKeyExtractor = (item: ContractorWorkCardModel) => String(item.workId);

const ContractorWorkCardRow = React.memo(function ContractorWorkCardRow({
  item,
  onOpen,
  styles,
}: ContractorWorkCardRowProps) {
  const sourceBadge = sourceBadgeTone(item.sourceKind);
  const statusBadge = statusBadgeTone(item.status);
  const qualityBadge = qualityBadgeTone(item.qualityState);
  const objectLine = React.useMemo(
    () => [item.objectName, item.systemName, item.zoneName].filter(Boolean).join(" / "),
    [item.objectName, item.systemName, item.zoneName],
  );
  const cardToken = React.useMemo(() => toCardToken(item.workId) || "unknown", [item.workId]);
  const handlePress = React.useCallback(() => onOpen(String(item.workId)), [item.workId, onOpen]);
  const pressedStyle = React.useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.card,
      styles.cardDark,
      styles.cardSeparated,
      CARD_BASE_STYLE,
      { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
    ],
    [styles],
  );
  const sourceBadgeStyle = React.useMemo(
    () => [BADGE_STYLE, { backgroundColor: sourceBadge.bg }],
    [sourceBadge.bg],
  );
  const sourceBadgeTextStyle = React.useMemo(
    () => [BADGE_TEXT_STYLE, { color: sourceBadge.fg }],
    [sourceBadge.fg],
  );
  const statusBadgeStyle = React.useMemo(
    () => [BADGE_STYLE, { backgroundColor: statusBadge.bg }],
    [statusBadge.bg],
  );
  const statusBadgeTextStyle = React.useMemo(
    () => [BADGE_TEXT_STYLE, { color: statusBadge.fg }],
    [statusBadge.fg],
  );
  const qualityBadgeStyle = React.useMemo(
    () => (qualityBadge ? [BADGE_STYLE, { backgroundColor: qualityBadge.bg }] : null),
    [qualityBadge],
  );
  const qualityBadgeTextStyle = React.useMemo(
    () => (qualityBadge ? [BADGE_TEXT_STYLE, { color: qualityBadge.fg }] : null),
    [qualityBadge],
  );

  return (
    <Pressable
      onPress={handlePress}
      testID={`contractor-work-card-${cardToken}`}
      style={pressedStyle}
    >
      <View style={CARD_CONTENT_STYLE}>
        <View style={BADGE_ROW_STYLE}>
          <View style={sourceBadgeStyle}>
            <Text style={sourceBadgeTextStyle}>{sourceBadge.label}</Text>
          </View>
          <View style={statusBadgeStyle}>
            <Text style={statusBadgeTextStyle}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
          {qualityBadge && qualityBadgeStyle && qualityBadgeTextStyle ? (
            <View style={qualityBadgeStyle}>
              <Text style={qualityBadgeTextStyle}>
                {qualityBadge.label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[styles.cardCompany, styles.cardCompanyDark, CONTRACTOR_TITLE_STYLE]}
          numberOfLines={1}
        >
          {normalizeRuText(item.contractorName || "РџРѕРґСЂСЏРґС‡РёРє")}
        </Text>

        <Text style={[styles.cardWork, styles.cardWorkDark, CARD_WORK_STYLE]} numberOfLines={2}>
          {normalizeRuText(item.title)}
        </Text>

        <View style={OBJECT_ROW_STYLE}>
          <View style={OBJECT_BADGE_STYLE}>
            <Text style={OBJECT_BADGE_TEXT_STYLE}>OBJECT</Text>
          </View>
          <Text style={[styles.cardObject, styles.cardObjectDark, OBJECT_TEXT_STYLE]} numberOfLines={2}>
            {normalizeRuText(objectLine || item.objectName || "РћР±СЉРµРєС‚")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function ContractorSubcontractsList(props: Props) {
  const { data, screenContract, refreshing, loadingWorks, onRefresh, onOpen, styles } = props;
  const emptyMessage = loadingWorks
    ? "Р—Р°РіСЂСѓР·РєР°..."
    : screenContract.message || "РќРµС‚ РЅР°Р·РЅР°С‡РµРЅРЅС‹С… РїРѕРґСЂСЏРґРЅС‹С… СЂР°Р±РѕС‚.";

  const refreshControl = React.useMemo(
    () => <RefreshControl refreshing={refreshing || loadingWorks} onRefresh={onRefresh} tintColor="#fff" />,
    [loadingWorks, onRefresh, refreshing],
  );
  const headerComponent = React.useMemo(
    () =>
      !loadingWorks &&
      data.length > 0 &&
      (screenContract.renderState === "ready_compat_degraded" ||
        screenContract.renderState === "ready_current_degraded_title") &&
      screenContract.message ? (
        <View style={[styles.card, styles.cardDark, LIST_NOTICE_CARD_STYLE]}>
          <Text style={[styles.cardMetaDark, CENTER_TEXT_STYLE]}>
            {normalizeRuText(screenContract.message)}
          </Text>
        </View>
      ) : null,
    [data.length, loadingWorks, screenContract.message, screenContract.renderState, styles],
  );
  const emptyComponent = React.useMemo(
    () => (
      <View style={[styles.card, styles.cardDark, LIST_EMPTY_CARD_STYLE]}>
        <Text style={[styles.cardMetaDark, CENTER_TEXT_STYLE]}>{normalizeRuText(emptyMessage)}</Text>
      </View>
    ),
    [emptyMessage, styles],
  );
  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<ContractorWorkCardModel>) => (
      <ContractorWorkCardRow item={item} onOpen={onOpen} styles={styles} />
    ),
    [onOpen, styles],
  );

  return (
    <FlashList
      style={LIST_STYLE}
      contentContainerStyle={LIST_CONTENT_STYLE}
      data={data}
      keyExtractor={contractorWorkCardKeyExtractor}
      estimatedItemSize={120}
      {...CONTRACTOR_SUBCONTRACTS_LIST_FLATLIST_TUNING}
      refreshControl={refreshControl}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={emptyComponent}
      renderItem={renderItem}
    />
  );
}

export default React.memo(ContractorSubcontractsList);
