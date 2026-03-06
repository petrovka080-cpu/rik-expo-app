export const statusColors = (s?: string | null) => {
  const v = (s ?? "").trim();
  if (v === "Утверждено") return { bg: "#DCFCE7", fg: "#166534" };
  if (v === "На утверждении") return { bg: "#DBEAFE", fg: "#1E3A8A" };
  if (v === "На доработке" || v.startsWith("На доработке")) return { bg: "#FEE2E2", fg: "#991B1B" };
  return { bg: "#E5E7EB", fg: "#111827" };
};

