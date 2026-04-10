import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import { useWarehouseUnmountSafety } from "./useWarehouseUnmountSafety";

export function useWarehouseKeyboard() {
  const [kbH, setKbH] = useState(0);
  const unmountSafety = useWarehouseUnmountSafety("warehouse_keyboard");

  useEffect(() => {
    if (Platform.OS === "web") return;

    const onShow = (e: KeyboardEvent) => {
      const h = Number(e?.endCoordinates?.height ?? 0);
      unmountSafety.guardStateUpdate(
        () => {
          setKbH(h > 0 ? h : 0);
        },
        {
          resource: "keyboard_show_height",
          reason: Platform.OS,
        },
      );
    };
    const onHide = () => {
      unmountSafety.guardStateUpdate(
        () => {
          setKbH(0);
        },
        {
          resource: "keyboard_hide_height",
          reason: Platform.OS,
        },
      );
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
      unmountSafety.runSubscriptionCleanup(() => subShow.remove(), {
        resource: "keyboard_show_listener",
        reason: Platform.OS,
      });
      unmountSafety.runSubscriptionCleanup(() => subHide.remove(), {
        resource: "keyboard_hide_listener",
        reason: Platform.OS,
      });
    };
  }, [unmountSafety]);

  return { kbH };
}
