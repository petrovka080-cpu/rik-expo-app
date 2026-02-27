export const UI = {
  bg: "#0B0F14",
  cardBg: "#101826",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "#1F2A37",
  btnApprove: "#22C55E",
  btnReject: "#EF4444",
  btnNeutral: "rgba(255,255,255,0.08)",
  accent: "#22C55E",
} as const;

export const TYPO = {
  titleLg: { fontSize: 24, fontWeight: "800" as const },
  titleSm: { fontSize: 16, fontWeight: "900" as const },
  sectionTitle: { fontSize: 20, fontWeight: "800" as const },
  groupTitle: { fontSize: 18, fontWeight: "900" as const },
  bodyStrong: { fontSize: 16, fontWeight: "800" as const },
  body: { fontSize: 14, fontWeight: "700" as const },
  meta: { fontSize: 12, fontWeight: "800" as const, letterSpacing: 0.2 },
  kpiLabel: { fontSize: 12, fontWeight: "700" as const },
  kpiValue: { fontSize: 12, fontWeight: "900" as const },
  btn: { fontSize: 13, fontWeight: "900" as const, letterSpacing: 0.2 },
} as const;

export const REQUEST_STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  draft: { label: "Черновик", bg: "#E2E8F0", fg: "#0F172A" },
  pending: { label: "На утверждении", bg: "#FEF3C7", fg: "#92400E" },
  approved: { label: "Утверждена", bg: "#DCFCE7", fg: "#166534" },
  rejected: { label: "Отклонена", bg: "#FEE2E2", fg: "#991B1B" },
};
