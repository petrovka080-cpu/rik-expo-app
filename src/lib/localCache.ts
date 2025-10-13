// src/lib/localCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HitLite = {
  ref_table: 'rik_works'|'rik_materials';
  ref_id: string;
  name: string;
  unit_id: string|null;
  code?: string|null;
  ts?: number;
};

const RECENTS_KEY = 'foreman.recents.v1';
const FAVS_KEY    = 'foreman.favs.v1';

async function read<T>(k: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
async function write<T>(k: string, v: T): Promise<void> {
  try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {}
}

export async function loadRecents(): Promise<HitLite[]> {
  return read<HitLite[]>(RECENTS_KEY, []);
}
export async function pushRecent(hit: HitLite, cap = 20): Promise<void> {
  const list = await loadRecents();
  const key = `${hit.ref_table}|${hit.ref_id}`;
  const filtered = list.filter(h => `${h.ref_table}|${h.ref_id}` !== key);
  filtered.unshift({ ...hit, ts: Date.now() });
  await write(RECENTS_KEY, filtered.slice(0, cap));
}

export async function loadFavs(): Promise<HitLite[]> {
  return read<HitLite[]>(FAVS_KEY, []);
}
export async function toggleFav(hit: HitLite): Promise<{ favs: HitLite[]; on: boolean }> {
  const list = await loadFavs();
  const key = `${hit.ref_table}|${hit.ref_id}`;
  const exists = list.find(h => `${h.ref_table}|${h.ref_id}` === key);
  let out: HitLite[];
  if (exists) out = list.filter(h => `${h.ref_table}|${h.ref_id}` !== key);
  else out = [{ ...hit, ts: Date.now() }, ...list].slice(0, 100);
  await write(FAVS_KEY, out);
  return { favs: out, on: !exists };
}
export function isFav(list: HitLite[], hit: HitLite) {
  const key = `${hit.ref_table}|${hit.ref_id}`;
  return !!list.find(h => `${h.ref_table}|${h.ref_id}` === key);
}
