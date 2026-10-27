import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export function useBuyerKeyboard(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setKbOpen(false);
      return;
    }

    const showEvt = "keyboardDidShow";
    const hideEvt = "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, () => setKbOpen(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbOpen(false));

    return () => {
      try {
        showSub.remove();
      } catch {
        // no-op
      }
      try {
        hideSub.remove();
      } catch {
        // no-op
      }
    };
  }, [enabled]);

  return { kbOpen };
}
