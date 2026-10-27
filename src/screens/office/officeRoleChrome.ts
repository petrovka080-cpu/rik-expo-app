import { useSegments } from "expo-router";
import { StyleSheet } from "react-native";

export const OFFICE_ROLE_UI = {
  bg: "#0B0F14",
  surface: "#101826",
  surfaceSoft: "rgba(255,255,255,0.03)",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.14)",
  accent: "#22C55E",
} as const;

export const officeRoleChrome = StyleSheet.create({
  roleMetaText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: OFFICE_ROLE_UI.sub,
  },
  summaryText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    color: OFFICE_ROLE_UI.sub,
  },
  switcherShell: {
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: OFFICE_ROLE_UI.border,
    backgroundColor: OFFICE_ROLE_UI.surfaceSoft,
    paddingVertical: 6,
  },
  switcherRow: {
    paddingHorizontal: 12,
    paddingRight: 16,
    alignItems: "center",
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: OFFICE_ROLE_UI.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: OFFICE_ROLE_UI.surface,
    borderColor: OFFICE_ROLE_UI.accent,
  },
  chipText: {
    color: OFFICE_ROLE_UI.sub,
    fontWeight: "600",
    fontSize: 13,
  },
  chipTextActive: {
    color: OFFICE_ROLE_UI.text,
  },
  screen: {
    flex: 1,
    backgroundColor: OFFICE_ROLE_UI.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  surfaceCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: OFFICE_ROLE_UI.border,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: OFFICE_ROLE_UI.text,
    fontSize: 18,
    fontWeight: "700",
  },
});

export function useIsOfficeRoute() {
  const segments = useSegments();
  return (segments as readonly string[]).includes("office");
}
