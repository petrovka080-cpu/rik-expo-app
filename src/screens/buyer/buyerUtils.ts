// src/screens/buyer/buyerUtils.ts
// ⚠️ PROD: без изменения логики, только утилиты

// ===== "без поставщика" =====
export const SUPP_NONE = "— без поставщика —";

// ===== нормализация названия (для группировки поставщиков) =====
export const normName = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/[.,;:()\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ===== split note: user / auto (реквизиты поставщика) =====
export const splitNote = (noteRaw?: string | null) => {
  const raw = String(noteRaw ?? "").trim();
  if (!raw) return { user: "", auto: "" };

  const parts = raw
    .split(/[\n;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const auto: string[] = [];
  const user: string[] = [];

  const isAuto = (ln: string) => {
    const s = ln.toLowerCase();
    return (
      s.includes("инн:") ||
      s.includes("счёт:") ||
      s.includes("счет:") ||
      s.includes("тел.:") ||
      s.includes("тел:") ||
      s.includes("email:")
    );
  };

  for (const p of parts) {
    (isAuto(p) ? auto : user).push(p);
  }

  return {
    user: user.join(" • "),
    auto: auto.join(" • "),
  };
};

// ===== merge note обратно =====
export const mergeNote = (userPart?: string, autoPart?: string) => {
  const u = String(userPart ?? "").trim();
  const a = String(autoPart ?? "").trim();
  if (u && a) return `${u} • ${a}`;
  return u || a || "";
};

// ===== определение "контекста заявки" =====
export const isReqContextNote = (raw?: string | null) => {
  const s = String(raw ?? "").toLowerCase();
  return (
    s.includes("объект:") ||
    s.includes("этаж") ||
    s.includes("уровень:") ||
    s.includes("система:") ||
    s.includes("зона:")
  );
};

// ===== извлечь строки контекста =====
export const extractReqContextLines = (raw?: string | null, max = 5) => {
  const lines = String(raw ?? "")
    .split(/[\n;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const pick = lines.filter((ln) => {
    const s = ln.toLowerCase();
    return (
      s.startsWith("объект:") ||
      s.startsWith("этаж") ||
      s.startsWith("уровень:") ||
      s.startsWith("система:") ||
      s.startsWith("зона:")
    );
  });

  return pick.slice(0, max);
};
