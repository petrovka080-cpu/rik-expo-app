import { recordSwallowedError } from "./observability/swallowedError";

type ExpoAvModule = typeof import("expo-av");
type NativeSound = InstanceType<ExpoAvModule["Audio"]["Sound"]>;

let sound: NativeSound | null = null;
let initializing: Promise<void> | null = null;
let generation = 0;

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

async function disposeOwnedSound(candidate: NativeSound) {
  try {
    await candidate.unloadAsync();
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
}

export async function initDing() {
  if (sound) return;
  if (initializing) return initializing;
  const owner = generation;
  const work = (async () => {
    const Audio = await loadNativeAudio();
    if (!Audio || owner !== generation) return;
    let candidate: NativeSound | null = null;
    try {
      candidate = new Audio.Sound();
      await candidate.loadAsync(require("../../assets/notify.wav"));
      if (owner !== generation) {
        await disposeOwnedSound(candidate);
        return;
      }
      sound = candidate;
    } catch (error) {
      if (candidate) await disposeOwnedSound(candidate);
      recordSwallowedError({
        screen: "notifications",
        surface: "notify_sound",
        event: "notify_native_init_failed",
        error,
        sourceKind: "audio:native",
        errorStage: "init",
      });
    }
  })();
  initializing = work;
  try { await work; }
  finally { if (initializing === work) initializing = null; }
}

export async function playDing() {
  const owner = generation;
  try {
    await initializing;
    if (owner !== generation) return;
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
  generation += 1;
  const pending = initializing;
  initializing = null;
  const owned = sound;
  sound = null;
  if (owned) await disposeOwnedSound(owned);
  // A load cannot be unloaded while the native SDK is still loading it. Its
  // generation check releases that exact instance as soon as loading settles.
  await pending;
}
