import { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from "react-native";

type ScrollResponderLike = {
  getScrollResponder?: () => {
    scrollResponderScrollNativeHandleToKeyboard?: (
      nodeHandle: number,
      additionalOffset: number,
      preventNegativeScrollOffset: boolean,
    ) => void;
  };
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset: number,
    preventNegativeScrollOffset: boolean,
  ) => void;
};

const asScrollResponder = (v: unknown): ScrollResponderLike | null =>
  v && typeof v === "object" ? (v as ScrollResponderLike) : null;

export function useAccountantKeyboard(cardScrollRef: { current: unknown }) {
  const [kbdH, setKbdH] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);

  const scrollInputIntoView = useCallback(
    (
      e: NativeSyntheticEvent<TextInputFocusEventData>,
      extra?: number,
    ) => {
      if (Platform.OS === "web") return;

      const node = Number((e as { target?: unknown })?.target ?? 0);
      if (!node) return;

      const additionalOffset = Number.isFinite(extra as number)
        ? Number(extra)
        : Platform.OS === "ios"
          ? 190
          : 160;

      setTimeout(() => {
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
      }, 60);
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
