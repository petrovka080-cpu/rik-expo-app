import { recordSwallowedError } from "./observability/swallowedError";

let audio: HTMLAudioElement | null = null;

export async function initDing() {
  if (!audio) audio = new Audio('/notify.mp3'); // from public/
}

export async function playDing() {
  try {
    if (!audio) audio = new Audio('/notify.mp3');
    await audio.play();
  } catch (error) {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_web_play_failed",
      error,
      sourceKind: "audio:web",
      errorStage: "play",
    });
  }
}

export async function unloadDing() {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch (error) {
    recordSwallowedError({
      screen: "notifications",
      surface: "notify_sound",
      event: "notify_web_unload_failed",
      error,
      kind: "cleanup_only",
      sourceKind: "audio:web",
      errorStage: "unload",
    });
  }
  audio = null;
}
