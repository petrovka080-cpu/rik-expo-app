const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const norm = (value?: string | null) => String(value ?? "").trim();

export const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

export const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr.slice()];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const asLooseRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

export const asUnknownRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

export const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const pickFirstString = (...values: readonly unknown[]): string | null => {
  for (const value of values) {
    const s = norm(value == null ? null : String(value));
    if (s) return s;
  }
  return null;
};

export const parseNumberValue = (...values: readonly unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value != null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

export const pickRefName = (ref: unknown) => {
  const record = asLooseRecord(ref);
  return (
    norm(record.name_ru == null ? null : String(record.name_ru)) ||
    norm(record.name_human_ru == null ? null : String(record.name_human_ru)) ||
    norm(record.display_name == null ? null : String(record.display_name)) ||
    norm(record.alias_ru == null ? null : String(record.alias_ru)) ||
    norm(record.name == null ? null : String(record.name)) ||
    norm(record.code == null ? null : String(record.code)) ||
    null
  );
};

export const buildRefShape = (row: unknown, keys: string[], code?: string | null) => {
  const source = asLooseRecord(row);
  const shape: Record<string, unknown> = {};
  shape.name_ru = pickFirstString(
    ...keys.map((key) => source[`${key}_name_ru`]),
    ...keys.map((key) => source[`${key}NameRu`]),
  );
  shape.name_human_ru = pickFirstString(
    ...keys.map((key) => source[`${key}_name_human_ru`]),
    ...keys.map((key) => source[`${key}NameHumanRu`]),
  );
  shape.display_name = pickFirstString(
    ...keys.map((key) => source[`${key}_display_name`]),
    ...keys.map((key) => source[`${key}DisplayName`]),
    ...keys.map((key) => source[`${key}_label`]),
    ...keys.map((key) => source[`${key}Label`]),
  );
  shape.alias_ru = pickFirstString(
    ...keys.map((key) => source[`${key}_alias_ru`]),
    ...keys.map((key) => source[`${key}AliasRu`]),
  );
  shape.name = pickFirstString(
    ...keys.map((key) => source[`${key}_name`]),
    ...keys.map((key) => source[`${key}Name`]),
    ...keys.map((key) => source[key]),
  );
  shape.code =
    code ||
    pickFirstString(
      ...keys.map((key) => source[`${key}_code`]),
      ...keys.map((key) => source[`${key}Code`]),
      ...keys.map((key) => source[key]),
    );
  return shape;
};

export const readRefName = (row: unknown, keys: string[], code?: string | null): string | null => {
  const source = asLooseRecord(row);
  for (const key of keys) {
    const value = source[key];
    if (isObjectLike(value)) return pickRefName(value);
  }
  return pickRefName(buildRefShape(row, keys, code));
};

export const SUPPLIER_NONE_LABEL = "\u2014 \u0431\u0435\u0437 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430 \u2014";
