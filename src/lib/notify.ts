import { Platform } from "react-native";

type NotifyModule = {
  initDing: () => Promise<void>;
  playDing: () => Promise<void>;
  unloadDing: () => Promise<void>;
};

const loadNotifyModule = (): NotifyModule => {
  if (Platform.OS === "web") {
    return require("./notify.web") as NotifyModule;
  }
  return require("./notify.native") as NotifyModule;
};

export async function initDing() {
  return loadNotifyModule().initDing();
}

export async function playDing() {
  return loadNotifyModule().playDing();
}

export async function unloadDing() {
  return loadNotifyModule().unloadDing();
}

