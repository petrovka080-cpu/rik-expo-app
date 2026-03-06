import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";

type JobCard = {
  id: string;
  contractor: string;
  contractorInn?: string | null;
  objectName: string;
  workType: string;
};

type Props = {
  data: JobCard[];
  refreshing: boolean;
  loadingWorks: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  styles: any;
};

export default function ContractorSubcontractsList(props: Props) {
  const { data, refreshing, loadingWorks, onRefresh, onOpen, styles } = props;
  return (
    <FlatList
      style={{ flex: 1, marginTop: 12 }}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
      data={data}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing || loadingWorks} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
          <Text style={styles.cardMetaDark}>{loadingWorks ? "Загрузка..." : "Нет данных."}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
          <Pressable onPress={() => onOpen(String(item.id))}>
            <Text style={[styles.cardCompany, styles.cardCompanyDark]}>
              {normalizeRuText(item.contractor || "Подрядчик")}
            </Text>
            {String(item.contractorInn || "").trim() ? (
              <Text style={[styles.cardMetaDark, { marginTop: 2 }]}>ИНН: {normalizeRuText(item.contractorInn)}</Text>
            ) : null}
            <Text style={[styles.cardWork, styles.cardWorkDark]}>{normalizeRuText(item.workType || "Работа")}</Text>
            <Text style={[styles.cardObject, styles.cardObjectDark]}>
              Объект: {normalizeRuText(item.objectName || "—")}
            </Text>
          </Pressable>
        </View>
      )}
    />
  );
}
