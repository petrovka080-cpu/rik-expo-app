// src/screens/buyer/buyerUi.ts

export const D = {
  bg: "#0B0F14",
  cardBg: "#101826",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "#1F2A37",
} as const;

// ===== Buyer DARK UI (как Director) =====
export const UI = {
  bg: D.bg,
  cardBg: D.cardBg,
  text: D.text,
  sub: D.sub,
  border: D.border,

  tabActiveBg: D.cardBg,
  tabInactiveBg: "rgba(255,255,255,0.06)",
  tabActiveText: D.text,
  tabInactiveText: D.sub,

  accent: "#22C55E",
  btnNeutral: "rgba(255,255,255,0.06)",
  btnBorder: "rgba(255,255,255,0.18)",

  // кнопки
  btnGreen: "#22C55E",
  btnRed: "#EF4444",
} as const;

export const KICK_THROTTLE_MS = 900;
export const TOAST_DEFAULT_MS = 1800;

// ✅ пресеты палитры для строки (чтобы не создавать объекты на каждый рендер)
export const P_SHEET = {
  cardBg: "rgba(16,24,38,0.92)",
  border: "rgba(255,255,255,0.16)",
  text: D.text,
  sub: D.sub,
  btnBg: "rgba(255,255,255,0.06)",
  btnBorder: "rgba(255,255,255,0.18)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.12)",
  chipGrayBg: "rgba(255,255,255,0.08)",
  chipGrayText: D.text,
} as const;

export const P_LIST = {
  cardBg: UI.cardBg,
  border: "rgba(255,255,255,0.18)",
  text: UI.text,
  sub: UI.sub,
  btnBg: "rgba(255,255,255,0.06)",
  btnBorder: "rgba(255,255,255,0.18)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.12)",
  chipGrayBg: "rgba(255,255,255,0.08)",
  chipGrayText: UI.text,
} as const;
