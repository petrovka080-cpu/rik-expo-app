const CP1251_EXTRA_BYTES: Array<[number, string]> = [
  [0x80, "Ђ"], [0x81, "Ѓ"], [0x82, "‚"], [0x83, "ѓ"], [0x84, "„"], [0x85, "…"], [0x86, "†"], [0x87, "‡"],
  [0x88, "€"], [0x89, "‰"], [0x8a, "Љ"], [0x8b, "‹"], [0x8c, "Њ"], [0x8d, "Ќ"], [0x8e, "Ћ"], [0x8f, "Џ"],
  [0x90, "ђ"], [0x91, "‘"], [0x92, "’"], [0x93, "“"], [0x94, "”"], [0x95, "•"], [0x96, "–"], [0x97, "—"],
  [0x99, "™"], [0x9a, "љ"], [0x9b, "›"], [0x9c, "њ"], [0x9d, "ќ"], [0x9e, "ћ"], [0x9f, "џ"],
  [0xa0, "\u00a0"], [0xa1, "Ў"], [0xa2, "ў"], [0xa3, "Ј"], [0xa4, "¤"], [0xa5, "Ґ"], [0xa6, "¦"], [0xa7, "§"],
  [0xa8, "Ё"], [0xa9, "©"], [0xaa, "Є"], [0xab, "«"], [0xac, "¬"], [0xad, "\u00ad"], [0xae, "®"], [0xaf, "Ї"],
  [0xb0, "°"], [0xb1, "±"], [0xb2, "І"], [0xb3, "і"], [0xb4, "ґ"], [0xb5, "µ"], [0xb6, "¶"], [0xb7, "·"],
  [0xb8, "ё"], [0xb9, "№"], [0xba, "є"], [0xbb, "»"], [0xbc, "ј"], [0xbd, "Ѕ"], [0xbe, "ѕ"], [0xbf, "ї"],
];

const charToByte = new Map<string, number>(CP1251_EXTRA_BYTES.map(([b, ch]) => [ch, b]));

const suspiciousMojiRe = /[ЃЂђљњќћџЄєЇїІіҐґ]|вЂ|в„|Рџ|СЂ|СЏ|Рё|Р°|Рѕ/;
const obviousReplacementRe = /\uFFFD/;

const scoreMojibake = (s: string): number => {
  if (!s) return 0;
  let score = 0;
  if (suspiciousMojiRe.test(s)) score += 3;
  if (obviousReplacementRe.test(s)) score += 4;
  const badPairs = s.match(/[РС][^\s]{0,1}/g);
  if (badPairs?.length) score += Math.min(6, badPairs.length);
  const weird = s.match(/[€™Ѓљњќћџ]/g);
  if (weird?.length) score += Math.min(6, weird.length);
  return score;
};

const cp1251ByteFromChar = (ch: string): number | null => {
  const code = ch.charCodeAt(0);
  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x044f) return code - 0x350;
  if (code === 0x0401) return 0xa8;
  if (code === 0x0451) return 0xb8;
  const extra = charToByte.get(ch);
  return extra == null ? null : extra;
};

const decodeUtf8Bytes = (bytes: number[]): string | null => {
  try {
    const encoded = bytes.map((b) => `%${b.toString(16).padStart(2, "0")}`).join("");
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
};

const decodeCp1251Mojibake = (input: string): string => {
  const bytes: number[] = [];
  for (const ch of input) {
    const b = cp1251ByteFromChar(ch);
    if (b == null) return input;
    bytes.push(b);
  }
  const decoded = decodeUtf8Bytes(bytes);
  return decoded ?? input;
};

export function normalizeRuText<T>(value: T): T {
  if (value == null) return value;
  const src = String(value);
  if (!src) return value;
  if (scoreMojibake(src) < 2) return value;

  let cur = src;
  for (let i = 0; i < 2; i++) {
    const next = decodeCp1251Mojibake(cur);
    if (!next || next === cur) break;
    if (scoreMojibake(next) >= scoreMojibake(cur)) break;
    cur = next;
  }

  return (cur as unknown) as T;
}
