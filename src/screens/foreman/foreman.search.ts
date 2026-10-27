import type { RefOption } from "./foreman.types";

type RankParams = {
  query: string;
  options: RefOption[];
  selectedCode?: string;
  recentCodes?: string[];
};

const recentByField = new Map<string, string[]>();
const RECENT_LIMIT = 6;

const normalize = (value: string): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD");
};

const normalizeFieldKey = (fieldKey: string) => String(fieldKey || "").trim();
const normalizeCode = (code: string) => String(code || "").trim();

export function getRecentForemanCodes(fieldKey: string): string[] {
  const key = normalizeFieldKey(fieldKey);
  if (!key) return [];
  const list = recentByField.get(key);
  return Array.isArray(list) ? [...list] : [];
}

export function pushRecentForemanCode(fieldKey: string, code: string): string[] {
  const key = normalizeFieldKey(fieldKey);
  const normalizedCode = normalizeCode(code);
  if (!key || !normalizedCode) return getRecentForemanCodes(key);

  const prev = getRecentForemanCodes(key).filter((x) => x !== normalizedCode);
  const next = [normalizedCode, ...prev].slice(0, RECENT_LIMIT);
  recentByField.set(key, next);
  return [...next];
}

export function rankForemanOptions({
  query,
  options,
  selectedCode = "",
  recentCodes = [],
}: RankParams): RefOption[] {
  const q = normalize(query);
  const selected = normalizeCode(selectedCode || "");
  const recentIndex = new Map<string, number>();
  recentCodes.forEach((code, idx) => {
    const key = normalizeCode(code);
    if (key && !recentIndex.has(key)) recentIndex.set(key, idx);
  });

  const ranked = options
    .map((opt, index) => {
      const code = String(opt.code || "").trim();
      const name = String(opt.name || "").trim();
      const codeNorm = normalize(code);
      const nameNorm = normalize(name);

      let score = 0;
      if (!q) {
        score = 100;
      } else if (codeNorm === q) {
        score = 1000;
      } else if (nameNorm === q) {
        score = 900;
      } else if (codeNorm.startsWith(q)) {
        score = 800;
      } else if (nameNorm.startsWith(q)) {
        score = 700;
      } else if (codeNorm.includes(q)) {
        score = 600;
      } else if (nameNorm.includes(q)) {
        score = 500;
      } else {
        score = -1;
      }

      if (score < 0) return null;

      if (selected && code === selected) score += 120;

      const rIdx = recentIndex.get(code);
      if (rIdx !== undefined) score += Math.max(0, 80 - rIdx * 8);

      return { opt, score, index, nameNorm };
    })
    .filter((x): x is { opt: RefOption; score: number; index: number; nameNorm: string } => Boolean(x));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.nameNorm !== b.nameNorm) return a.nameNorm.localeCompare(b.nameNorm, "ru");
    return a.index - b.index;
  });

  return ranked.map((x) => x.opt);
}
