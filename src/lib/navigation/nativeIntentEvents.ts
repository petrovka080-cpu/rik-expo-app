import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from "react-native";

const RIK_INTENT_MODULE_NAME = "RikIntent";
export const RIK_INTENT_VIEW_URL_EVENT = "RikIntentViewUrl";

type RikIntentNativeModule = {
  getLatestViewUrl?: () => Promise<string | null>;
  clearLatestViewUrl?: (url?: string | null) => void;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

const emptySubscription = (): EmitterSubscription =>
  ({
    remove: () => undefined,
  }) as EmitterSubscription;

function getRikIntentModule(): RikIntentNativeModule | null {
  if (Platform.OS !== "android") return null;
  const module = NativeModules[RIK_INTENT_MODULE_NAME] as RikIntentNativeModule | undefined;
  return module ?? null;
}

export async function getLatestNativeViewUrl(): Promise<string | null> {
  const module = getRikIntentModule();
  if (!module?.getLatestViewUrl) return null;
  const value = await module.getLatestViewUrl();
  return typeof value === "string" && value.trim() ? value : null;
}

export function clearLatestNativeViewUrl(url: string | null | undefined) {
  const module = getRikIntentModule();
  module?.clearLatestViewUrl?.(url ?? null);
}

export function addNativeViewUrlListener(
  handler: (url: string) => void,
): EmitterSubscription {
  if (Platform.OS !== "android") return emptySubscription();
  const module = getRikIntentModule();
  if (!module) return emptySubscription();
  return new NativeEventEmitter(module).addListener(RIK_INTENT_VIEW_URL_EVENT, (url: unknown) => {
    if (typeof url === "string" && url.trim()) {
      handler(url);
    }
  });
}
