// src/utils.ts

export const normalizeUuid = (raw: string | null | undefined): string | null => {
    const s = String(raw ?? "").trim();
    if (!s || s.length !== 36) return null; // basic guard
    return s;
};

export const toFilterId = (v: number | string | null | undefined): string | null => {
    if (v == null || v === "" || v === "null") return null;
    const s = String(v).trim();
    if (s.toLowerCase() === "none" || s.toLowerCase() === "no_object") return null;
    return s;
};
