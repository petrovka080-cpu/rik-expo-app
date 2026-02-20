
// src/screens/accountant/ui.ts
export const UI = {
  bg: "#0B0F14",
  cardBg: "#101826",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "#1F2A37",

  tabActiveBg: "#101826",
  tabInactiveBg: "transparent",
  tabActiveText: "#F8FAFC",
  tabInactiveText: "#9CA3AF",

  btnApprove: "#22C55E",
  btnReject: "#EF4444",
  btnNeutral: "rgba(255,255,255,0.08)",

  accent: "#22C55E",
};

export const TOK = {
  rCard: 18,
  rBox: 16,
  rBtn: 14,

  borderStrong: "rgba(255,255,255,0.16)",
  borderSoft: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.04)",
  field: "rgba(255,255,255,0.06)",

  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const S = {
  section: {
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: TOK.borderStrong,
    borderRadius: TOK.rBox,
    padding: 12,
    ...TOK.shadow,
  },

  glass: {
    backgroundColor: TOK.glass,
    borderWidth: 1,
    borderColor: TOK.borderSoft,
    borderRadius: TOK.rBox,
    padding: 10,
  },

  label: { color: UI.sub, fontWeight: "800" as const, fontSize: 12, letterSpacing: 0.3 },
  value: { color: UI.text, fontWeight: "900" as const },

  input: (ok: boolean) => ({
    borderWidth: 1,
    borderColor: ok ? "rgba(255,255,255,0.14)" : "#EF4444",
    backgroundColor: TOK.field,
    borderRadius: 12,
    padding: 12,
    color: UI.text,
    fontWeight: "700" as const,
  }),
};

