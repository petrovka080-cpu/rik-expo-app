import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

export function useWarehouseKeyboard() {
  const [kbH, setKbH] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const onShow = (e: KeyboardEvent) => {
      const h = Number(e?.endCoordinates?.height ?? 0);
      setKbH(h > 0 ? h : 0);
    };
    const onHide = () => setKbH(0);

    const subShow =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", onShow)
        : Keyboard.addListener("keyboardDidShow", onShow);
    const subHide =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillHide", onHide)
        : Keyboard.addListener("keyboardDidHide", onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return { kbH };
}

