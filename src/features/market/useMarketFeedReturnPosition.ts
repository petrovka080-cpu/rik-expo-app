import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useFocusEffect } from "expo-router";

type ScrollableFeed = {
  scrollToOffset: (input: { offset: number; animated: boolean }) => void;
};

/** The outgoing position must survive inactive-screen and virtual-list layout events. */
export function useMarketFeedReturnPosition(
  listRef: RefObject<ScrollableFeed | null>,
  filterIdentity: string,
) {
  const state = useRef({
    focused: false,
    offset: 0,
    pending: null as number | null,
    awaitingReturn: false,
    frame: null as number | null,
  });
  const cancelFrame = useCallback(() => {
    if (state.current.frame != null) cancelAnimationFrame(state.current.frame);
    state.current.frame = null;
  }, []);
  const restoreFeedScrollOffset = useCallback(() => {
    const current = state.current;
    if (!current.focused || current.awaitingReturn || current.pending == null) return;
    cancelFrame();
    current.frame = requestAnimationFrame(() => {
      const next = state.current;
      next.frame = null;
      if (next.focused && !next.awaitingReturn && next.pending != null) {
        listRef.current?.scrollToOffset({ offset: next.pending, animated: false });
      }
    });
  }, [cancelFrame, listRef]);

  useFocusEffect(useCallback(() => {
    state.current.focused = true;
    state.current.awaitingReturn = false;
    restoreFeedScrollOffset();
    return () => {
      state.current.focused = false;
      cancelFrame();
    };
  }, [cancelFrame, restoreFeedScrollOffset]));

  useEffect(() => {
    cancelFrame();
    state.current.pending = null;
    state.current.awaitingReturn = false;
  }, [cancelFrame, filterIdentity]);

  const recordFeedScrollOffset = useCallback((offset: number) => {
    const current = state.current;
    if (!current.focused || current.awaitingReturn || !Number.isFinite(offset)) return;
    const next = Math.max(0, offset);
    current.offset = next;
    // A short first layout may clamp the restore. Keep the target until the
    // list reports it, and retry when its viewport/content finishes measuring.
    if (current.pending != null && Math.abs(next - current.pending) > 1) return;
    current.pending = null;
  }, []);
  const saveListingReturnOffset = useCallback(() => {
    state.current.pending = state.current.offset;
    state.current.awaitingReturn = true;
  }, []);
  const cancelFeedScrollRestore = useCallback(() => {
    cancelFrame();
    state.current.pending = null;
    state.current.awaitingReturn = false;
  }, [cancelFrame]);

  return { recordFeedScrollOffset, restoreFeedScrollOffset, saveListingReturnOffset, cancelFeedScrollRestore };
}
