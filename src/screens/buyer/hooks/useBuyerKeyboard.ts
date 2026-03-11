import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export function useBuyerKeyboard() {
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
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
  }, []);

  return { kbOpen };
}
