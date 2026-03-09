export const ROLE_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  x2: 24,
  x3: 28,
  x4: 32,
} as const;

export const ROLE_RADIUS = {
  card: 16,
  block: 16,
  pill: 999,
} as const;

export const ROLE_TYPE = {
  headerTitle: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  headerSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  sectionTitle: { fontSize: 14, lineHeight: 18, fontWeight: "600" as const },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  badge: { fontSize: 12, lineHeight: 14, fontWeight: "600" as const },
} as const;

export const ROLE_COLOR = {
  text: "#F8FAFC",
  subText: "#9CA3AF",
  cardBg: "#101826",
  border: "rgba(255,255,255,0.12)",
  indicator: "rgba(156,163,175,0.85)",
} as const;
