import { Pressable, Text, View } from "react-native";

import { s } from "./director.styles";
import { styles } from "./DirectorReportsModal.styles";

type Props = {
  applyObjectFilter: (name: string | null) => Promise<void>;
  objectCount: number;
  objectCountExplanation: string;
  objectCountLabel: string;
  onOpenRepObj: () => void;
  repObjectName: string | null;
  repOptLoading: boolean;
};

export function DirectorReportsObjectFilterSummary({
  applyObjectFilter,
  objectCount,
  objectCountExplanation,
  objectCountLabel,
  onOpenRepObj,
  repObjectName,
  repOptLoading,
}: Props) {
  return (
    <View style={styles.mb10}>
      <Text style={styles.filterLabel}>Склад</Text>
      <View style={styles.filterWrap}>
        <Pressable onPress={() => void applyObjectFilter(null)} style={[s.tab, !repObjectName && s.tabActive, styles.filterTabSpacing]}>
          <Text style={[styles.filterTabText, !repObjectName ? styles.filterTabTextActive : styles.filterTabTextInactive]}>Все</Text>
        </Pressable>
        <Pressable onPress={onOpenRepObj} style={[s.tab, repObjectName && s.tabActive, styles.filterTabSpacing]}>
          <Text style={[styles.filterTabText, repObjectName ? styles.filterTabTextActive : styles.filterTabTextInactive]}>{`${objectCountLabel} · ${objectCount}`}</Text>
        </Pressable>
        {repObjectName ? (
          <Pressable onPress={onOpenRepObj} style={[s.tab, s.tabActive, styles.filterTabSpacing]}>
            <Text numberOfLines={1} style={styles.selectedObjectNameText}>{repObjectName}</Text>
          </Pressable>
        ) : null}
        {repOptLoading ? <Text style={styles.repOptLoadingText}>…</Text> : null}
      </View>
      <Text style={[s.mobMeta, styles.mt6]} numberOfLines={2}>{objectCountLabel}</Text>
      <Text style={[s.mobMeta, styles.mt4]} numberOfLines={3}>{objectCountExplanation}</Text>
    </View>
  );
}
