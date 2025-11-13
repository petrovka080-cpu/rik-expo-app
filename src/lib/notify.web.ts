let audio: HTMLAudioElement | null = null;

export async function initDing() {
  if (!audio) audio = new Audio('/notify.mp3'); // из public/
}

export async function playDing() {
  try {
    if (!audio) audio = new Audio('/notify.mp3');
    await audio.play();
  } catch {
    // некоторые браузеры требуют user-gesture — проигнорируем молча
  }
}

export async function unloadDing() {
  try {
    if (audio) { audio.pause(); audio.currentTime = 0; }
  } catch {}
  audio = null;
}
