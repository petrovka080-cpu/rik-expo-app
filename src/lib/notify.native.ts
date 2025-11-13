import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

export async function initDing() {
  if (sound) return;
  sound = new Audio.Sound();
  // путь от src/lib до assets
  await sound.loadAsync(require('../../assets/notify.mp3'));
}

export async function playDing() {
  try { await sound?.replayAsync(); } catch {}
}

export async function unloadDing() {
  try { await sound?.unloadAsync(); } catch {}
  sound = null;
}
