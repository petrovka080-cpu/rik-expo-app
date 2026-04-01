import type { AppAccessOfficeRole } from "../../lib/appAccessModel";

export const PROFILE_UI = {
  bg: "#020617",
  card: "#0F172A",
  cardSoft: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#22C55E",
  accentSoft: "rgba(34,197,94,0.12)",
} as const;

const PROFILE_ROLE_LABELS: Record<AppAccessOfficeRole, string> = {
  director: "Директор",
  buyer: "Снабженец",
  foreman: "Прораб",
  warehouse: "Склад",
  accountant: "Бухгалтер",
  security: "Безопасность",
  contractor: "Подрядчик",
  engineer: "Инженер",
};

const normalizeRoleKey = (role: string | null): string =>
  String(role ?? "").trim().toLowerCase();

export const getProfileRoleLabel = (role: string | null): string =>
  PROFILE_ROLE_LABELS[normalizeRoleKey(role) as AppAccessOfficeRole] ??
  "Роль GOX";

export const getProfileRoleColor = (role: string | null): string => {
  switch (normalizeRoleKey(role)) {
    case "director":
      return "#2563EB";
    case "buyer":
      return "#14B8A6";
    case "foreman":
      return "#F97316";
    case "warehouse":
      return "#22C55E";
    case "accountant":
      return "#A855F7";
    case "security":
      return "#EF4444";
    case "contractor":
      return "#F59E0B";
    case "engineer":
      return "#06B6D4";
    default:
      return PROFILE_UI.accent;
  }
};

export const getProfileDisplayName = (args: {
  fullName: string | null | undefined;
  email: string | null | undefined;
  companyName: string | null | undefined;
  userId: string | null | undefined;
}): string => {
  const fullName = args.fullName?.trim() || "";
  const looksGenerated =
    !fullName ||
    /^[0-9a-f]{8,}$/i.test(fullName) ||
    /^[0-9a-f-]{20,}$/i.test(fullName);

  if (!looksGenerated) {
    return fullName;
  }

  return (
    args.email?.split("@")[0]?.trim() ||
    args.companyName?.trim() ||
    args.userId?.slice(0, 8) ||
    "GOX"
  );
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "profile_error");
