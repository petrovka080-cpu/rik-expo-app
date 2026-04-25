import React from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
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

export default function ContractorSubcontractsList(props: Props) {
  const { data, screenContract, refreshing, loadingWorks, onRefresh, onOpen, styles } = props;
  const emptyMessage = loadingWorks
    ? "Р—Р°РіСЂСѓР·РєР°..."
    : screenContract.message || "РќРµС‚ РЅР°Р·РЅР°С‡РµРЅРЅС‹С… РїРѕРґСЂСЏРґРЅС‹С… СЂР°Р±РѕС‚.";

  return (
    <FlashList
      style={{ flex: 1, marginTop: 12 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      data={data}
      keyExtractor={(item) => String(item.workId)}
      estimatedItemSize={120}
      refreshControl={<RefreshControl refreshing={refreshing || loadingWorks} onRefresh={onRefresh} tintColor="#fff" />}
      ListHeaderComponent={
        !loadingWorks &&
        data.length > 0 &&
        (screenContract.renderState === "ready_compat_degraded" ||
          screenContract.renderState === "ready_current_degraded_title") &&
        screenContract.message ? (
          <View style={[styles.card, styles.cardDark, { borderRadius: 18, padding: 16, marginBottom: 12 }]}>
            <Text style={[styles.cardMetaDark, { textAlign: "center" }]}>
              {normalizeRuText(screenContract.message)}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={[styles.card, styles.cardDark, { borderRadius: 18, padding: 20 }]}>
          <Text style={[styles.cardMetaDark, { textAlign: "center" }]}>{normalizeRuText(emptyMessage)}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const sourceBadge = sourceBadgeTone(item.sourceKind);
        const statusBadge = statusBadgeTone(item.status);
        const qualityBadge = qualityBadgeTone(item.qualityState);
        const objectLine = [item.objectName, item.systemName, item.zoneName].filter(Boolean).join(" / ");
        const cardToken = toCardToken(item.workId) || "unknown";

        return (
          <Pressable
            onPress={() => onOpen(String(item.workId))}
            testID={`contractor-work-card-${cardToken}`}
            style={({ pressed }) => [
              styles.card,
              styles.cardDark,
              styles.cardSeparated,
              { borderRadius: 18, overflow: "hidden", padding: 14 },
              { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <View
                  style={{
                    backgroundColor: sourceBadge.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: sourceBadge.fg, fontSize: 11, fontWeight: "900" }}>{sourceBadge.label}</Text>
                </View>
                <View
                  style={{
                    backgroundColor: statusBadge.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: statusBadge.fg, fontSize: 11, fontWeight: "900" }}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
                {qualityBadge ? (
                  <View
                    style={{
                      backgroundColor: qualityBadge.bg,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: qualityBadge.fg, fontSize: 11, fontWeight: "900" }}>
                      {qualityBadge.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[styles.cardCompany, styles.cardCompanyDark, { fontSize: 18, marginBottom: 4 }]}
                numberOfLines={1}
              >
                {normalizeRuText(item.contractorName || "Подрядчик")}
              </Text>

              <Text style={[styles.cardWork, styles.cardWorkDark, { fontWeight: "700", fontSize: 14 }]} numberOfLines={2}>
                {normalizeRuText(item.title)}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                <View
                  style={{
                    backgroundColor: "rgba(59,130,246,0.15)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "900" }}>OBJECT</Text>
                </View>
                <Text style={[styles.cardObject, styles.cardObjectDark, { marginTop: 0, flex: 1 }]} numberOfLines={2}>
                  {normalizeRuText(objectLine || item.objectName || "Объект")}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
