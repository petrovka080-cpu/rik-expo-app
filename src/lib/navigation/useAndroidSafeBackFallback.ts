import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { hasSafeBackHistory, safeBack } from "./safeBack";

/** Keep a directly opened Android route inside the app when its stack is empty. */
export function useAndroidSafeBackFallback(fallbackRoute: Href) {
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // A real preceding screen belongs to the navigator's normal Back path.
      if (hasSafeBackHistory(router)) return false;
      safeBack(router, fallbackRoute);
      return true;
    });
    return () => subscription.remove();
  }, [fallbackRoute]));
}
