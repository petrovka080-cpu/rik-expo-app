import { Alert, Platform } from "react-native";

const showPlatformNotice = (title: string, message?: string) => {
  const body = message?.trim();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert([title, body].filter(Boolean).join("\n"));
    return;
  }
  Alert.alert(title, body);
};

/**
 * Global helper for short user-facing notices.
 */
export const showToast = {
  success: (title: string, message?: string) => {
    showPlatformNotice(title, message);
  },
  error: (title: string, message?: string) => {
    showPlatformNotice(title, message);
  },
  info: (title: string, message?: string) => {
    showPlatformNotice(title, message);
  },
};
