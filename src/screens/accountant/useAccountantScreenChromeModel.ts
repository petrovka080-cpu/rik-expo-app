import { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRevealSection } from "../../lib/useRevealSection";
import { useAccountantHeaderAnimation } from "./useAccountantHeaderAnimation";
import { useAccountantKeyboard } from "./useAccountantKeyboard";

export function useAccountantScreenChromeModel() {
  const insets = useSafeAreaInsets();
  const cardScrollY = useRef(new Animated.Value(0)).current;
  const payFormReveal = useRevealSection(24);
  const cardScrollRef = useRef<ScrollView | null>(null);

  const {
    scrollY,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
  } = useAccountantHeaderAnimation();

  const listScrollEvent = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
    [scrollY],
  );
  const cardScrollEvent = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: cardScrollY } } }], { useNativeDriver: false }),
    [cardScrollY],
  );

  const onListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    listScrollEvent(event);
  }, [listScrollEvent]);

  const onCardScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    cardScrollEvent(event);
  }, [cardScrollEvent]);

  const { kbOpen, kbdH, scrollInputIntoView } = useAccountantKeyboard(cardScrollRef);
  const kbTypeNum: "default" | "numeric" = Platform.OS === "web" ? "default" : "numeric";

  return {
    insets,
    cardScrollRef,
    payFormReveal,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
    onListScroll,
    onCardScroll,
    kbTypeNum,
    kbOpen,
    kbdH,
    scrollInputIntoView,
  };
}
