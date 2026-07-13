import { recordSwallowedError } from "./observability/swallowedError";

type ExpoAvModule = typeof import("expo-av");
type NativeSound = InstanceType<ExpoAvModule["Audio"]["Sound"]>;

let sound: NativeSound | null = null;

async function loadNativeAudio(): Promise<ExpoAvModule["Audio"] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("expo-av") as ExpoAvModule).Audio;
  } catch (error) {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_native_module_unavailable",
      error,
      sourceKind: "audio:native",
      errorStage: "module_load",
    });
    return null;
  }
}

export async function initDing() {
  if (sound) return;
  const Audio = await loadNativeAudio();
  if (!Audio) return;
  try {
    sound = new Audio.Sound();
    // путь от src/lib до assets
    await sound.loadAsync(require("../../assets/notify.mp3"));
  } catch (error) {
    sound = null;
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_native_init_failed",
      error,
      sourceKind: "audio:native",
      errorStage: "init",
    });
  }
}

export async function playDing() {
  try {
    await sound?.replayAsync();
  } catch (error) {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_native_replay_failed",
      error,
      sourceKind: "audio:native",
      errorStage: "replay",
    });
  }
}

export async function unloadDing() {
  try {
    await sound?.unloadAsync();
  } catch (error) {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_native_unload_failed",
      error,
      kind: "cleanup_only",
      sourceKind: "audio:native",
      errorStage: "unload",
    });
  }
  sound = null;
}
