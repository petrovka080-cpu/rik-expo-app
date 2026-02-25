import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import type { MarketListing } from "./MapScreen";
import { zoomFromRegion } from "./pixelCluster";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MyLoc = {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number | null;
};

type Props = {
  listings: MarketListing[];
  spiderPoints?: MarketListing[];
  hideClusterId?: string | null;
  selectedId: string | null;
  region: Region;
  myLoc: MyLoc | null;
  onSelect: (id: string) => void;
  onRegionChange: (r: Region) => void;
  onViewportChange: (v: { zoom: number }) => void;
};

const UI = { border: "#1F2937", demand: "#EF4444" };

const getKindColor = (kind?: string | null) => {
  if (kind === "material") return "#22C55E";
  if (kind === "work") return "#8B5CF6";
  if (kind === "service") return "#0EA5E9";
  return "#7C3AED";
};

const getDemandLabel = (item: any) => {
  const cnt =
    (typeof item?.__clusterCount === "number" && item.__clusterCount > 0)
      ? item.__clusterCount
      : (Array.isArray(item?.__clusterItems) ? item.__clusterItems.length : 0) || 1;

  return cnt > 1 ? `НУЖНО (${cnt})` : "НУЖНО";
};

export default function MapRendererNative({
  listings,
  spiderPoints = [],
  hideClusterId = null,
  selectedId,
  region,
  myLoc,
  onSelect,
  onRegionChange,
  onViewportChange,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    mapRef.current?.animateToRegion?.(region, 260);
  }, [region]);

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a1 = Animated.loop(
      Animated.timing(pulse1, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    const a2 = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [pulse1, pulse2]);

  const pulseStyle1 = useMemo(() => {
    const scale = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.95] });
    const opacity = pulse1.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.65, 0.18, 0] });
    return { transform: [{ scale }], opacity };
  }, [pulse1]);

  const pulseStyle2 = useMemo(() => {
    const scale = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.55] });
    const opacity = pulse2.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.12, 0] });
    return { transform: [{ scale }], opacity };
  }, [pulse2]);

  const hasSpider = Array.isArray(spiderPoints) && spiderPoints.length > 0;

  const visibleListings = useMemo(() => {
    const arr = listings.filter((l: any) => l.lat != null && l.lng != null);
    if (!hasSpider || !hideClusterId) return arr;
    return arr.filter((x: any) => x.id !== hideClusterId);
  }, [listings, hasSpider, hideClusterId]);

  return (
    <MapView
      ref={(r) => { mapRef.current = r; }}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      region={region}
      onRegionChangeComplete={(r) => {
        const rr = r as any as Region;
        onRegionChange(rr);
        const z = zoomFromRegion(rr.longitudeDelta, width);
        onViewportChange({ zoom: z });
      }}
    >
      {myLoc?.accuracy != null && (
        <Circle
          center={{ latitude: myLoc.latitude, longitude: myLoc.longitude }}
          radius={Math.max(10, myLoc.accuracy)}
          strokeWidth={1}
          strokeColor={"rgba(29,78,216,0.25)"}
          fillColor={"rgba(59,130,246,0.10)"}
        />
      )}

      {myLoc && (
        <Marker
          coordinate={{ latitude: myLoc.latitude, longitude: myLoc.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.myWrap}>
            <View style={[styles.cone, { transform: [{ rotate: `${myLoc.heading || 0}deg` }] }]} />
            <Animated.View style={[styles.pulseRing1, pulseStyle1]} />
            <Animated.View style={[styles.pulseRing2, pulseStyle2]} />
            <View style={styles.halo}>
              <View style={styles.core} />
            </View>
          </View>
        </Marker>
      )}

      {hasSpider &&
        spiderPoints.map((item: any) => {
          const isSelected = selectedId === item.id;
          const bg = item.side === "demand" ? UI.demand : getKindColor(item.kind);

          return (
            <Marker
              key={`spider:${item.id}`}
              coordinate={{ latitude: Number(item.lat), longitude: Number(item.lng) }}
              onPress={() => onSelect(item.id)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.bubble,
                  { backgroundColor: bg, borderColor: isSelected ? "#F9FAFB" : UI.border },
                ]}
              >
                <Text style={styles.bubbleText}>
                  {item.side === "demand"
                    ? "НУЖНО"
                    : item.price != null
                      ? `${Number(item.price).toLocaleString("ru-RU")} KGS`
                      : "Цена?"}
                </Text>
              </View>
            </Marker>
          );
        })}

      {visibleListings.map((item: any) => {
        const isSelected = selectedId === item.id;
        const bg = item.side === "demand" ? UI.demand : getKindColor(item.kind);

        return (
          <Marker
            key={item.id}
            coordinate={{ latitude: Number(item.lat), longitude: Number(item.lng) }}
            onPress={() => onSelect(item.id)}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.bubble,
                { backgroundColor: bg, borderColor: isSelected ? "#F9FAFB" : UI.border },
              ]}
            >
              <Text style={styles.bubbleText}>
                {item.side === "demand"
                  ? getDemandLabel(item)
                  : item.price != null
                    ? `${Number(item.price).toLocaleString("ru-RU")} KGS`
                    : "Цена?"}
              </Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleText: { fontSize: 10, fontWeight: "900", color: "#FFF" },

  myWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },

  cone: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 56,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(37,99,235,0.22)",
    top: 2,
  },

  pulseRing1: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.35)",
  },
  pulseRing2: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.28)",
  },

  halo: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.20)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  core: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.98)",
  },
});
