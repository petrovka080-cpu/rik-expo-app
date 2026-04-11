import { Audio } from 'expo-av';
import { recordSwallowedError } from "./observability/swallowedError";

let sound: Audio.Sound | null = null;

export async function initDing() {
  if (sound) return;
  sound = new Audio.Sound();
  // путь от src/lib до assets
  await sound.loadAsync(require('../../assets/notify.mp3'));
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
