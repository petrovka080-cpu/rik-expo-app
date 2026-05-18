import { Pressable, Text, View } from "react-native";

import type { DirectorReportsCanonicalDiagnostics } from "./director.readModels";
import { s } from "./director.styles";
import { styles } from "./DirectorReportsModal.styles";

type Props = {
  applyObjectFilter: (name: string | null) => Promise<void>;
  noWorkNameCount: number;
  noWorkNameExplanation: string;
  objectCount: number;
  objectCountExplanation: string;
  objectCountLabel: string;
  onOpenRepObj: () => void;
  repObjectName: string | null;
  repOptLoading: boolean;
  reportDiagnostics: DirectorReportsCanonicalDiagnostics | null;
  unresolvedNamesCount: number;
};

export function DirectorReportsObjectFilterSummary({
  applyObjectFilter,
  noWorkNameCount,
  noWorkNameExplanation,
  objectCount,
  objectCountExplanation,
  objectCountLabel,
  onOpenRepObj,
  repObjectName,
  repOptLoading,
  reportDiagnostics,
  unresolvedNamesCount,
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
      {noWorkNameCount > 0 ? (
        <Text style={[s.mobMeta, styles.mt4]} numberOfLines={3}>
          {`Без вида работ: ${noWorkNameCount}${reportDiagnostics ? ` (${reportDiagnostics.noWorkName.share}% позиций)` : ""} · ${noWorkNameExplanation}`}
        </Text>
      ) : null}
      {unresolvedNamesCount > 0 ? (
        <Text style={[s.mobMeta, styles.mt4WarningText]} numberOfLines={3}>
          {`Неразрешённых кодов: ${unresolvedNamesCount}. Именование частично деградировало, но экран сохраняет backend-owned truth.`}
        </Text>
      ) : null}
      {reportDiagnostics ? (
        <Text style={[s.mobMeta, styles.mt4]} numberOfLines={3}>
          {`Именование: объекты ${reportDiagnostics.naming.objectNamingSourceStatus} · работы ${reportDiagnostics.naming.workNamingSourceStatus} · names ${reportDiagnostics.naming.namesViewStatus} · overrides ${reportDiagnostics.naming.overridesStatus} · ledger ${reportDiagnostics.naming.balanceViewStatus}`}
        </Text>
      ) : null}
    </View>
  );
}
