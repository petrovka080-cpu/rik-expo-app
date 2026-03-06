import { useCallback, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";

export function useBuyerHeaderCollapse() {
  const HEADER_MIN = 76;
  const [measuredHeaderMax, setMeasuredHeaderMax] = useState<number>(160);
  const HEADER_MAX = Math.max(measuredHeaderMax, 160);
  const HEADER_SCROLL = Math.max(0, HEADER_MAX - HEADER_MIN);

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = useMemo(
    () => Animated.diffClamp(scrollY, 0, HEADER_SCROLL || 1),
    [scrollY, HEADER_SCROLL]
  );

  const headerHeight = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [HEADER_MAX, HEADER_MIN],
        extrapolate: "clamp",
      }),
    [clampedY, HEADER_SCROLL, HEADER_MAX]
  );

  const titleSize = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [24, 16],
        extrapolate: "clamp",
      }),
    [clampedY, HEADER_SCROLL]
  );

  const subOpacity = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [clampedY, HEADER_SCROLL]
  );

  const headerShadow = useMemo(
    () =>
      clampedY.interpolate({
        inputRange: [0, 10],
        outputRange: [0, 0.12],
        extrapolate: "clamp",
      }),
    [clampedY]
  );

  const onHeaderMeasure = useCallback(
    (height: number) => {
      if (height > 0 && height > measuredHeaderMax + 2) {
        requestAnimationFrame(() => setMeasuredHeaderMax(height));
      }
    },
    [measuredHeaderMax]
  );

  return {
    measuredHeaderMax,
    scrollY,
    headerHeight,
    titleSize,
    subOpacity,
    headerShadow,
    onHeaderMeasure,
  };
}

