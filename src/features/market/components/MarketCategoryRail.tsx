import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketHomeCategoryCard, MarketHomeCategoryKey } from "../marketHome.types";

type Props = {
  categories: MarketHomeCategoryCard[];
  activeCategory: MarketHomeCategoryKey | "all";
  onSelect: (category: MarketHomeCategoryKey) => void;
};

export default function MarketCategoryRail({
  categories,
  activeCategory,
  onSelect,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {categories.map((category) => {
        const active = activeCategory === category.key;
        return (
          <Pressable
            key={category.key}
            style={[styles.card, active ? styles.cardActive : null]}
            onPress={() => onSelect(category.key)}
          >
            <View style={[styles.imageShell, { backgroundColor: category.accent }]}>
              <Image source={category.imageSource} style={styles.image} resizeMode="cover" />
            </View>
            <Text style={styles.label}>{category.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 168,
    minHeight: 92,
    borderRadius: 24,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardActive: {
    borderColor: MARKET_HOME_COLORS.accent,
    shadowOpacity: 0.1,
  },
  imageShell: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  label: {
    flex: 1,
    color: MARKET_HOME_COLORS.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
});
