import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MigrationPair = {
  from: string;
  to: string;
};

export async function crossStorageGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return window.localStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function crossStorageSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

export async function crossStorageRemove(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch {
    // no-op
  }
}

export async function migrateCrossStorageKeysOnce(params: {
  markerKey: string;
  pairs: MigrationPair[];
}): Promise<void> {
  try {
    const done = await crossStorageGet(params.markerKey);
    if (done === "1") return;

    for (const pair of params.pairs) {
      const current = await crossStorageGet(pair.to);
      if (current != null && String(current).length > 0) continue;

      const legacy = await crossStorageGet(pair.from);
      if (legacy == null) continue;
      await crossStorageSet(pair.to, legacy);
    }

    await crossStorageSet(params.markerKey, "1");
  } catch {
    // no-op
  }
}

