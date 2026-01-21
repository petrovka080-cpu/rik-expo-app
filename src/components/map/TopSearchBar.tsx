import React, { memo } from "react";
import { View, Text, Pressable, Platform, StatusBar, StyleSheet } from "react-native";
import type { Filters } from "./types";

const UI = {
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  card: "rgba(11,17,32,0.92)",
  accent: "#0EA5E9",
};

type Props = {
  filters: Filters;
  activeFiltersCount: number;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
};

const SlidersIcon = memo(function SlidersIcon({ color }: { color: string }) {
  return (
    <View style={icon.wrap}>
      <View style={[icon.line, { backgroundColor: color, top: 6 }]} />
      <View style={[icon.knob, { borderColor: color, left: 6, top: 2 }]} />

      <View style={[icon.line, { backgroundColor: color, top: 14 }]} />
      <View style={[icon.knob, { borderColor: color, left: 16, top: 10 }]} />

      <View style={[icon.line, { backgroundColor: color, top: 22 }]} />
      <View style={[icon.knob, { borderColor: color, left: 10, top: 18 }]} />
    </View>
  );
});

const icon = StyleSheet.create({
  wrap: { width: 26, height: 26, position: "relative" },
  line: { position: "absolute", left: 2, right: 2, height: 2, borderRadius: 99, opacity: 0.95 },
  knob: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 99,
    borderWidth: 2,
    backgroundColor: UI.card,
  },
});

export default function TopSearchBar({ filters, activeFiltersCount, onOpenSearch, onOpenFilters }: Props) {
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;
  const top = topInset + 8;

  const searchLabel = filters.catalogItem?.name_human ? filters.catalogItem.name_human : "Поиск по каталогу…";
  const subline = `${filters.city ? filters.city : "Город"} • ${filters.kind === "all" ? "Все" : filters.kind}`;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top }]}>
      <View style={styles.row}>
        <Pressable pointerEvents="auto" onPress={onOpenSearch} style={styles.searchBtn}>
          <Text style={styles.searchTitle} numberOfLines={1}>
            {searchLabel}
          </Text>
          <Text style={styles.searchSub} numberOfLines={1}>
            {subline}
          </Text>
        </Pressable>

        <Pressable pointerEvents="auto" onPress={onOpenFilters} style={styles.filterBtn} hitSlop={10}>
          <SlidersIcon color={UI.text} />
          {activeFiltersCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, zIndex: 9999, elevation: 50 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  searchBtn: {
    flex: 1,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchTitle: { color: UI.text, fontWeight: "900", fontSize: 15 },
  searchSub: { color: UI.sub, marginTop: 2 },

  filterBtn: {
    width: 54,
    height: 54,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  badge: {
    position: "absolute",
    right: -6,
    top: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#0B1120", fontWeight: "900", fontSize: 12 },
});
