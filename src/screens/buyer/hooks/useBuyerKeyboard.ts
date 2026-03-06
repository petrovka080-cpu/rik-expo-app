import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useBuyerKeyboard() {
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

