import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  InteractionManager,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type TextInputFocusEventData,
} from "react-native";

type ScrollToKeyboard = (
  nodeHandle: number,
  additionalOffset: number,
  preventNegativeScrollOffset: boolean,
) => void;

type ScrollResponderLike = {
  getScrollResponder?: () => {
    scrollResponderScrollNativeHandleToKeyboard?: ScrollToKeyboard;
  };
  scrollResponderScrollNativeHandleToKeyboard?: ScrollToKeyboard;
};

const isScrollToKeyboard = (value: unknown): value is ScrollToKeyboard =>
  typeof value === "function";

const isGetScrollResponder = (value: unknown): value is () => unknown =>
  typeof value === "function";

const asScrollResponder = (value: unknown): ScrollResponderLike | null => {
  if (!value || typeof value !== "object") return null;

  const getScrollResponder = Reflect.get(value, "getScrollResponder");
  const scrollToKeyboard = Reflect.get(
    value,
    "scrollResponderScrollNativeHandleToKeyboard",
  );

  return {
    getScrollResponder: isGetScrollResponder(getScrollResponder)
      ? () => getScrollResponder.call(value)
      : undefined,
    scrollResponderScrollNativeHandleToKeyboard: isScrollToKeyboard(
      scrollToKeyboard,
    )
      ? scrollToKeyboard
      : undefined,
  };
};

export function useAccountantKeyboard(
  cardScrollRef: RefObject<ScrollView | null>,
) {
  const [kbdH, setKbdH] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);

  const scrollInputIntoView = useCallback(
    (
      e: NativeSyntheticEvent<TextInputFocusEventData>,
      extra?: number,
    ) => {
      if (Platform.OS === "web") return;

      const node = Number(e.target ?? 0);
      if (!node) return;

      const additionalOffset = typeof extra === "number" && Number.isFinite(extra)
        ? Number(extra)
        : Platform.OS === "ios"
          ? 190
          : 160;

      InteractionManager.runAfterInteractions(() => {
        try {
          const responderHolder = asScrollResponder(cardScrollRef.current);
          const responder =
            responderHolder?.getScrollResponder?.() ?? responderHolder;

          responder?.scrollResponderScrollNativeHandleToKeyboard?.(
            node,
            additionalOffset,
            true,
          );
        } catch {
          // no-op
        }
      });
    },
    [cardScrollRef],
  );

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s1 = Keyboard.addListener(showEvt, (e: KeyboardEvent) => {
      setKbOpen(true);
      setKbdH(Number(e?.endCoordinates?.height ?? 0));
    });

    const s2 = Keyboard.addListener(hideEvt, () => {
      setKbOpen(false);
      setKbdH(0);
    });

    return () => {
      try {
        s1.remove();
      } catch {
        // no-op
      }
      try {
        s2.remove();
      } catch {
        // no-op
      }
    };
  }, []);

  return { kbOpen, kbdH, scrollInputIntoView };
}
