import React from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";
import { FlashList } from "../../../ui/FlashList";
import type { ContractorScreenContract } from "../contractor.visibilityRecovery";

type JobCard = {
  id: string;
  contractor: string;
  contractorInn?: string | null;
  objectName: string;
  workType: string;
};

type Props = {
  data: JobCard[];
  screenContract: ContractorScreenContract;
  refreshing: boolean;
  loadingWorks: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  styles: any;
};

export default function ContractorSubcontractsList(props: Props) {
  const { data, screenContract, refreshing, loadingWorks, onRefresh, onOpen, styles } = props;
  const emptyMessage = loadingWorks
    ? "Загрузка..."
    : screenContract.message || "Нет назначенных подрядных работ.";

  return (
    <FlashList
      style={{ flex: 1, marginTop: 12 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      data={data}
      keyExtractor={(item) => String(item.id)}
      estimatedItemSize={108}
      refreshControl={<RefreshControl refreshing={refreshing || loadingWorks} onRefresh={onRefresh} tintColor="#fff" />}
      ListHeaderComponent={
        !loadingWorks && data.length > 0 && screenContract.state === "degraded" && screenContract.message ? (
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
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpen(String(item.id))}
          style={({ pressed }) => [
            styles.card,
            styles.cardDark,
            styles.cardSeparated,
            { borderRadius: 18, overflow: "hidden", padding: 14 },
            { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.cardCompany, styles.cardCompanyDark, { fontSize: 18, marginBottom: 4 }]}
              numberOfLines={1}
            >
              {normalizeRuText(item.contractor)}
            </Text>

            <Text style={[styles.cardWork, styles.cardWorkDark, { fontWeight: "700", fontSize: 14 }]} numberOfLines={1}>
              {normalizeRuText(item.workType)}
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
                <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "900" }}>ОБЪЕКТ</Text>
              </View>
              <Text style={[styles.cardObject, styles.cardObjectDark, { marginTop: 0, flex: 1 }]} numberOfLines={1}>
                {normalizeRuText(item.objectName)}
              </Text>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}
