import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { CanonicalEstimateConditionProfileV1 } from "../../../lib/estimate/backendPlatform/contracts";
import {
  canonicalEstimateConditionProfileLabelRuV1,
  canonicalEstimateConditionProfileReadyV1,
} from "../../../lib/estimate/backendPlatform/canonicalEstimateConditionProfilesV1";

/** One catalog card; condition choices retain their own exact definitions. */
export function CanonicalWorkConditionProfileSelector(props: {
  profiles?: readonly CanonicalEstimateConditionProfileV1[];
  matchedCatalogId?: string | null;
  estimateReady: boolean;
  nonselectableReasonRu?: string | null;
  onSelect: (catalogId?: string) => void;
  children: React.ReactNode;
  testIDPrefix: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const grouped = (props.profiles?.length ?? 0) > 1;
  const only = props.profiles?.length === 1 ? props.profiles[0] : null;
  const ready = only ? canonicalEstimateConditionProfileReadyV1(only) : props.estimateReady;
  const unavailable = !grouped && !ready;
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: unavailable, ...(grouped ? { expanded } : {}) }}
      disabled={unavailable} testID={props.testIDPrefix}
      onPress={() => grouped ? setExpanded(value => !value) : props.onSelect(only?.catalogId)}
      style={[props.style, unavailable && props.disabledStyle]}>
      {props.children}
      {grouped ? <Text style={styles.hint}>Условия выполнения ({props.profiles!.length})</Text>
        : unavailable ? <Text style={styles.reason} testID={`${props.testIDPrefix}-unavailable`}>
          {only?.nonselectableReasonRu || props.nonselectableReasonRu
            || "Эта смета проходит обновление состава и временно недоступна для нового расчёта."}
        </Text> : null}
    </Pressable>
    {grouped && expanded ? <View style={styles.options} testID={`${props.testIDPrefix}-conditions`}>
      {props.profiles!.map(profile => {
        const allowed = canonicalEstimateConditionProfileReadyV1(profile);
        const label = canonicalEstimateConditionProfileLabelRuV1(profile);
        return <Pressable key={profile.catalogId} accessibilityRole="button" accessibilityLabel={label}
          accessibilityState={{ disabled: !allowed, selected: props.matchedCatalogId === profile.catalogId }}
          disabled={!allowed} testID={`${props.testIDPrefix}-condition-${profile.conditionId}`}
          onPress={() => props.onSelect(profile.catalogId)} style={[styles.option, !allowed && styles.unavailable]}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.unit}>{profile.primaryUom}</Text>
          {!allowed ? <Text style={styles.reason}>{profile.nonselectableReasonRu
            || "Расчёт для этих условий временно недоступен."}</Text> : null}
        </Pressable>;
      })}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  hint: { color: "#0369A1", fontSize: 12, fontWeight: "700", marginTop: 3 },
  options: { gap: 6, marginLeft: 12, marginTop: 6 },
  option: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 6, padding: 10,
    minHeight: 44, justifyContent: "center", backgroundColor: "#F8FAFC" },
  label: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  unit: { color: "#64748B", fontSize: 12 },
  unavailable: { opacity: 0.72, backgroundColor: "#FFFBEB" },
  reason: { color: "#92400E", fontSize: 11, lineHeight: 15, fontWeight: "700" },
});
