import { useMemo, useRef } from "react";
import { Animated } from "react-native";

type Params = {
  headerMax: number;
  headerMin: number;
  contentTopOffset?: number;
};

export function useCollapsingHeader(p: Params) {
  const headerScroll = Math.max(1, p.headerMax - p.headerMin);
  const scrollY = useRef(new Animated.Value(0)).current;

  const clampedY = useMemo(
    () => Animated.diffClamp(scrollY, 0, headerScroll),
    [scrollY, headerScroll],
  );

  const headerHeight = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, headerScroll],
        outputRange: [p.headerMax, p.headerMin],
        extrapolate: "clamp",
      }),
    [clampedY, headerScroll, p.headerMax, p.headerMin],
  );

  const titleSize = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, headerScroll],
        outputRange: [24, 16],
        extrapolate: "clamp",
      }),
    [clampedY, headerScroll],
  );

  const subOpacity = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, headerScroll * 0.7],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [clampedY, headerScroll],
  );

  const headerShadow = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, 8],
        outputRange: [0, 0.12],
        extrapolate: "clamp",
      }),
    [clampedY],
  );

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      ),
    [scrollY],
  );

  return {
    headerMax: p.headerMax,
    headerMin: p.headerMin,
    contentTopPad: p.headerMax + (p.contentTopOffset ?? 12),
    headerHeight,
    titleSize,
    subOpacity,
    headerShadow,
    onScroll,
  };
}
