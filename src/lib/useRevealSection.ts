import { useCallback, useMemo, useRef } from "react";
import { Platform, ScrollView } from "react-native";

type ScrollToLike = {
  scrollTo?: (opts: { y: number; animated?: boolean }) => void;
};

export function useRevealSection(offset = 24) {
  const scrollRef = useRef<ScrollToLike | null>(null);
  const sectionYRef = useRef<number>(0);

  const registerSection = useCallback((y: number) => {
    sectionYRef.current = Math.max(0, Math.floor(y || 0));
  }, []);

  const onSectionLayout = useCallback((e: any) => {
    const y = e?.nativeEvent?.layout?.y ?? 0;
    registerSection(y);
  }, [registerSection]);

  const reveal = useCallback(() => {
    // requestAnimationFrame: даём UI дорендерить форму/секцию
    requestAnimationFrame(() => {
      const y = Math.max(0, (sectionYRef.current ?? 0) - offset);

      // на web scrollTo иногда другой, но у RNW обычно есть
      scrollRef.current?.scrollTo?.({ y, animated: Platform.OS !== "web" });
    });
  }, [offset]);

  return useMemo(() => {
    return {
      scrollRef,
      onSectionLayout,
      reveal,
      registerSection,
    };
  }, [onSectionLayout, reveal, registerSection]);
}
