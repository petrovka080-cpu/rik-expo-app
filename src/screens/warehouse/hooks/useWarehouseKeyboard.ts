import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export function useWarehouseKeyboard(params?: {
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const screenActiveRef = useWarehouseFallbackActiveRef(
    params?.screenActiveRef,
  );
  const [kbH, setKbH] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const onShow = (e: KeyboardEvent) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const h = Number(e?.endCoordinates?.height ?? 0);
      setKbH(h > 0 ? h : 0);
    };
    const onHide = () => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      setKbH(0);
    };

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
  }, [screenActiveRef]);

  return { kbH };
}
