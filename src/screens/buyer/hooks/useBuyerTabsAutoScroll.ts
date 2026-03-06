import { useEffect, useRef } from "react";
import { Platform } from "react-native";

export function useBuyerTabsAutoScroll(scrollTabsToStart: (animated?: boolean) => void) {
  const didAutoScrollTabs = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (didAutoScrollTabs.current) return;
    didAutoScrollTabs.current = true;

    requestAnimationFrame(() => {
      scrollTabsToStart(false);
    });
  }, [scrollTabsToStart]);
}

