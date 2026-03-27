import React from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "../../../ui/FlashList";

type WorkRowLite = {
  progress_id: string;
  work_name: string | null;
  work_code: string | null;
  object_name: string | null;
};

type Props = {
  data: WorkRowLite[];
  refreshing: boolean;
  loadingWorks: boolean;
  onRefresh: () => void;
  onOpenWork: (row: WorkRowLite) => void;
  toHumanWork: (v: string | null) => string;
  toHumanObject: (v: string | null) => string;
  styles: any;
};

export default function ContractorOtherWorksList(props: Props) {
  const { data, refreshing, loadingWorks, onRefresh, onOpenWork, toHumanWork, toHumanObject, styles } = props;
  return (
    <FlashList
      style={{ flex: 1, marginTop: 12 }}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
      data={data}
      keyExtractor={(item) => `other:${String(item.progress_id)}`}
      estimatedItemSize={92}
      refreshControl={<RefreshControl refreshing={refreshing || loadingWorks} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
          <Text style={styles.cardMetaDark}>Нет данных.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, styles.cardDark, styles.cardSeparated]}>
          <Pressable
            onPress={() => onOpenWork(item)}
            style={({ pressed }) => [styles.workCardTap, pressed && styles.workCardTapPressed]}
          >
            <Text style={[styles.cardTitle, { color: "#F8FAFC" }]}>{toHumanWork(item.work_name || item.work_code)}</Text>
            <Text style={styles.cardMetaDark}>Объект: {toHumanObject(item.object_name)}</Text>
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
              <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
            </View>
          </Pressable>
        </View>
      )}
    />
  );
}
