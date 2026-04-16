import { logger } from "../logger.ts";

const CP1251_EXTRA_CODEPOINTS: [number, number][] = [
  [0x80, 0x0402], [0x81, 0x0403], [0x82, 0x201a], [0x83, 0x0453], [0x84, 0x201e], [0x85, 0x2026], [0x86, 0x2020], [0x87, 0x2021],
  [0x88, 0x20ac], [0x89, 0x2030], [0x8a, 0x0409], [0x8b, 0x2039], [0x8c, 0x040a], [0x8d, 0x040c], [0x8e, 0x040b], [0x8f, 0x040f],
  [0x90, 0x0452], [0x91, 0x2018], [0x92, 0x2019], [0x93, 0x201c], [0x94, 0x201d], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
  [0x99, 0x2122], [0x9a, 0x0459], [0x9b, 0x203a], [0x9c, 0x045a], [0x9d, 0x045c], [0x9e, 0x045b], [0x9f, 0x045f],
  [0xa0, 0x00a0], [0xa1, 0x040e], [0xa2, 0x045e], [0xa3, 0x0408], [0xa4, 0x00a4], [0xa5, 0x0490], [0xa6, 0x00a6], [0xa7, 0x00a7],
  [0xa8, 0x0401], [0xa9, 0x00a9], [0xaa, 0x0404], [0xab, 0x00ab], [0xac, 0x00ac], [0xad, 0x00ad], [0xae, 0x00ae], [0xaf, 0x0407],
  [0xb0, 0x00b0], [0xb1, 0x00b1], [0xb2, 0x0406], [0xb3, 0x0456], [0xb4, 0x0491], [0xb5, 0x00b5], [0xb6, 0x00b6], [0xb7, 0x00b7],
  [0xb8, 0x0451], [0xb9, 0x2116], [0xba, 0x0454], [0xbb, 0x00bb], [0xbc, 0x0458], [0xbd, 0x0405], [0xbe, 0x0455], [0xbf, 0x0457],
];

const cp1251UnicodeToByte = new Map<number, number>(
  CP1251_EXTRA_CODEPOINTS.map(([byte, codepoint]) => [codepoint, byte])
);

const suspiciousMojiRe = /[РС][\u00a0 ]|[РС][A-Za-zА-Яа-яЁё]|[вВ][\u00a0 ]|вЂ|Ð|Ñ|Ã|Â|�/;

const scoreMojibake = (s: string): number => {
  if (!s) return 0;
  let score = 0;
  if (suspiciousMojiRe.test(s)) score += 4;

  const tokens = s.match(/Р.|С.|в.|В.|Ð.|Ñ.|Ã.|Â./g);
  if (tokens?.length) score += Math.min(20, tokens.length);

  const cyr = s.match(/[А-Яа-яЁё]/g)?.length || 0;
  if (cyr === 0 && score > 0) score += 3;

  if (/\uFFFD/.test(s)) score += 5;
  return score;
};

const collapseBrokenMojibakeSpacing = (input: string): string => {
  let cur = input;
  for (let i = 0; i < 6; i++) {
    const next = cur
      .replace(/([РСВвÐÑÃÂ])[\u00a0 ]+(?=[A-Za-zА-Яа-яЁё])/g, "$1")
      // Broken sequence: "РВ..." often should be "Р²..." (cp1252 byte artifact)
      .replace(/([РС])[’'`´"]?В(?=[РС])/g, "$1²")
      .replace(/([РСВвÐÑÃÂ])['’`´"]/g, "$1")
      .replace(/([РСВвÐÑÃÂ])(?:\u200b|\u200c|\u200d|\ufeff)+/g, "$1")
      .replace(/\u00a0/g, " ");
    if (next === cur) break;
    cur = next;
  }
  return cur;
};

const isIgnorableMojibakeNoise = (code: number): boolean => {
  return (
    code === 0x2018 || // ‘
    code === 0x2019 || // ’
    code === 0x0060 || // `
    code === 0x00b4 || // ´
    code === 0x0027 || // '
    code === 0x0022 || // "
    code === 0x200b || // zero-width space
    code === 0x200c || // ZWNJ
    code === 0x200d || // ZWJ
    code === 0xfeff // BOM
  );
};

const cp1251ByteFromChar = (ch: string): number | null => {
  const code = ch.charCodeAt(0);

  if (isIgnorableMojibakeNoise(code)) return -1 as unknown as number;

  if (code <= 0x7f) return code;

  if (code >= 0x0410 && code <= 0x044f) return code - 0x350;

  if (code === 0x0401) return 0xa8; // Ё
  if (code === 0x0451) return 0xb8; // ё

  const extra = cp1251UnicodeToByte.get(code);
  return extra == null ? null : extra;
};

const decodeUtf8Bytes = (bytes: number[]): string | null => {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    try {
      const encoded = bytes.map((b) => `%${b.toString(16).padStart(2, "0")}`).join("");
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }
};

const decodeCp1251Mojibake = (input: string): string => {
  const bytes: number[] = [];
  let unknown = 0;
  for (const ch of input) {
    const b = cp1251ByteFromChar(ch);
    if ((b as number) === -1) continue;
    if (b == null) {
      // Best-effort mode for noisy mojibake: preserve simple ASCII/space, skip the rest.
      const code = ch.charCodeAt(0);
      if (code <= 0x7f) {
        bytes.push(code);
      } else if (/\s/.test(ch)) {
        bytes.push(0x20);
      } else {
        unknown += 1;
      }
      continue;
    }
    bytes.push(b);
  }
  if (!bytes.length) return input;
  const decoded = decodeUtf8Bytes(bytes);
  if (!decoded) return input;

  // If too much unknown noise was dropped, keep original text.
  if (unknown > Math.max(3, Math.floor(input.length * 0.15))) return input;
  return decoded;
};

export function isCorruptedText(value: unknown): boolean {
  if (value == null) return false;
  const src = String(value);
  if (!src) return false;
  return scoreMojibake(collapseBrokenMojibakeSpacing(src)) >= 4;
}

export function normalizeRuText<T>(value: T): T {
  if (value == null) return value;
  const src = String(value);
  if (!src) return value;

  const rank = (s: string): number => {
    const bad = scoreMojibake(s);
    const cyr = s.match(/[А-Яа-яЁё]/g)?.length || 0;
    const latin = s.match(/[A-Za-z]/g)?.length || 0;
    return cyr * 2 - bad * 3 - latin * 0.1;
  };

  let cur = collapseBrokenMojibakeSpacing(src);
  let best = cur;
  let bestRank = rank(cur);

  for (let i = 0; i < 6; i++) {
    const pre = collapseBrokenMojibakeSpacing(cur);
    const next = decodeCp1251Mojibake(pre);
    if (!next || next === cur) break;

    const nextRank = rank(next);
    if (nextRank > bestRank) {
      best = next;
      bestRank = nextRank;
    }

    cur = next;
  }

  return (best as unknown) as T;
}

type NormalizeRuHtmlOptions = {
  documentType?: string | null;
  source?: string | null;
  maxLength?: number;
};

const logEncodingDebug = (...args: unknown[]) => {
  logger.info("encoding", ...args);
};

const warnEncodingDebug = (...args: unknown[]) => {
  logger.warn("encoding", ...args);
};

const errorEncodingDebug = (...args: unknown[]) => {
  logger.error("encoding", ...args);
};

const looksLikeHtmlDocument = (input: string) =>
  /<!doctype html|<html\b|<head\b|<body\b|<\/html>/i.test(input);

export function normalizeRuTextForHtml<T>(value: T, opts?: NormalizeRuHtmlOptions): T {
  if (value == null) return value;

  try {
    const src = String(value);
    if (!src) return value;

    const htmlLike = looksLikeHtmlDocument(src);
    const maxLength = Number.isFinite(Number(opts?.maxLength)) ? Number(opts?.maxLength) : 12000;

    logEncodingDebug("[encoding] normalize_ru_text_started", {
      inputType: typeof value,
      stringLength: src.length,
      looksLikeHtml: htmlLike,
      documentType: opts?.documentType ?? null,
      source: opts?.source ?? null,
      suspiciousMojibake: suspiciousMojiRe.test(src),
    });

    if (htmlLike && src.length > maxLength) {
      warnEncodingDebug("[encoding] normalize_ru_text_skipped_large_html", {
        stringLength: src.length,
        maxLength,
        documentType: opts?.documentType ?? null,
        source: opts?.source ?? null,
      });
      return value;
    }

    const out = normalizeRuText(value);
    logEncodingDebug("[encoding] normalize_ru_text_done", {
      stringLength: src.length,
      looksLikeHtml: htmlLike,
      documentType: opts?.documentType ?? null,
      source: opts?.source ?? null,
    });
    return out;
  } catch (error) {
    errorEncodingDebug("[encoding] normalize_ru_text_failed", {
      inputType: typeof value,
      documentType: opts?.documentType ?? null,
      source: opts?.source ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
    return value;
  }
}
