import React, { useMemo, useState } from "react";
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketHomeBanner } from "../marketHome.types";

type Props = {
  banners: MarketHomeBanner[];
  onPressBanner: (banner: MarketHomeBanner) => void;
};

export default function MarketHeroCarousel({ banners, onPressBanner }: Props) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const pageWidth = useMemo(() => Math.max(320, width), [width]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActiveIndex(Math.max(0, Math.min(banners.length - 1, index)));
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <View key={banner.id} style={[styles.page, { width: pageWidth }]}>
            <ImageBackground source={banner.imageSource} style={styles.card} imageStyle={styles.cardImage}>
              <View style={styles.overlay}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{banner.title}</Text>
                  <Text style={styles.description}>{banner.description}</Text>
                </View>

                <Pressable style={styles.ctaButton} onPress={() => onPressBanner(banner)}>
                  <Text style={styles.ctaText}>{banner.ctaLabel}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {banners.map((banner, index) => (
          <View
            key={banner.id}
            style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
  },
  card: {
    height: 244,
    justifyContent: "flex-end",
  },
  cardImage: {
    borderRadius: 30,
  },
  overlay: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: MARKET_HOME_COLORS.heroOverlay,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 22,
    justifyContent: "space-between",
  },
  copy: {
    maxWidth: 280,
    gap: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  description: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  ctaButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  dots: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 24,
    backgroundColor: MARKET_HOME_COLORS.accent,
  },
});
