import type { ProfileListingSummary } from "./profile.types";

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

export const generateInviteCode = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return `GB-${code}`;
};

export const getListingKindLabel = (kind: string | null): string => {
  switch (kind) {
    case "material":
      return "РјР°С‚РµСЂРёР°Р»С‹";
    case "service":
      return "СѓСЃР»СѓРіРё";
    case "rent":
      return "Р°СЂРµРЅРґР°";
    default:
      return "РѕР±СЉСЏРІР»РµРЅРёСЏ";
  }
};

export const buildProfileAssistantPrompt = (args: {
  profileName: string;
  city: string | null | undefined;
  companyName: string | null | undefined;
  modeMarket: boolean;
  modeBuild: boolean;
  listings: ProfileListingSummary[];
}): string => {
  const parts: string[] = [
    `РџРѕРјРѕРіРё РјРЅРµ СЃ РёРЅС‚РµРіСЂРёСЂРѕРІР°РЅРЅС‹Рј РїСЂРѕС„РёР»РµРј GOX. РњРµРЅСЏ Р·РѕРІСѓС‚ ${args.profileName}.`,
  ];

  if (args.companyName) {
    parts.push(`РљРѕРјРїР°РЅРёСЏ: ${args.companyName}.`);
  }

  if (args.city) {
    parts.push(`Р“РѕСЂРѕРґ: ${args.city}.`);
  }

  parts.push(
    `Р РµР¶РёРј РѕР±СЉСЏРІР»РµРЅРёР№: ${args.modeMarket ? "РІРєР»СЋС‡РµРЅ" : "РІС‹РєР»СЋС‡РµРЅ"}. Р РµР¶РёРј РєРѕРјРїР°РЅРёРё: ${
      args.modeBuild ? "РІРєР»СЋС‡РµРЅ" : "РІС‹РєР»СЋС‡РµРЅ"
    }.`,
  );

  if (args.listings.length > 0) {
    const listingSummary = args.listings
      .slice(0, 3)
      .map((item) => {
        const price =
          item.price != null && String(item.price).trim() ? `, С†РµРЅР° ${String(item.price)}` : "";
        const city = item.city ? `, ${item.city}` : "";
        const status = item.status ? `, СЃС‚Р°С‚СѓСЃ ${item.status}` : "";
        return `${item.title} (${getListingKindLabel(item.kind)}${city}${price}${status})`;
      })
      .join("; ");

    parts.push(`РњРѕРё РѕР±СЉСЏРІР»РµРЅРёСЏ: ${listingSummary}.`);
    parts.push(
      "РџРѕРґСЃРєР°Р¶Рё, РєР°Рє Р»СѓС‡С€Рµ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РІРёС‚СЂРёРЅСѓ РїРѕСЃС‚Р°РІС‰РёРєР°, РєР°СЂС‚Сѓ Рё AI РІРЅСѓС‚СЂРё С‚РµРєСѓС‰РµРіРѕ РїСЂРёР»РѕР¶РµРЅРёСЏ Р±РµР· РёР·РјРµРЅРµРЅРёСЏ Р±РёР·РЅРµСЃ-Р»РѕРіРёРєРё.",
    );
  } else {
    parts.push(
      "РЈ РјРµРЅСЏ РїРѕРєР° РЅРµС‚ РѕРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹С… РѕР±СЉСЏРІР»РµРЅРёР№. РџРѕРґСЃРєР°Р¶Рё, СЃ С‡РµРіРѕ РЅР°С‡Р°С‚СЊ РІРёС‚СЂРёРЅСѓ РїРѕСЃС‚Р°РІС‰РёРєР° Рё РєР°Рє СЃРІСЏР·Р°С‚СЊ РµРµ СЃ РєР°СЂС‚РѕР№ Рё AI РІРЅСѓС‚СЂРё С‚РµРєСѓС‰РµРіРѕ РїСЂРёР»РѕР¶РµРЅРёСЏ.",
    );
  }

  return parts.join(" ");
};

export const getProfileRoleLabel = (role: string | null): string => {
  switch (String(role || "").trim()) {
    case "director":
      return "Р”РёСЂРµРєС‚РѕСЂ";
    case "buyer":
      return "РЎРЅР°Р±Р¶РµРЅРµС†";
    case "foreman":
      return "РџСЂРѕСЂР°Р±";
    case "warehouse":
      return "РЎРєР»Р°Рґ";
    case "accountant":
      return "Р‘СѓС…РіР°Р»С‚РµСЂ";
    case "security":
      return "Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ";
    case "contractor":
      return "РџРѕРґСЂСЏРґС‡РёРє";
    default:
      return "РџСЂРѕС„РёР»СЊ GOX";
  }
};

export const getProfileRoleColor = (role: string | null): string => {
  switch (String(role || "").trim()) {
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
  const looksGenerated = !fullName || /^[0-9a-f]{8,}$/i.test(fullName) || /^[0-9a-f-]{20,}$/i.test(fullName);

  if (!looksGenerated) {
    return fullName;
  }

  return args.email?.split("@")[0]?.trim() || args.companyName?.trim() || args.userId?.slice(0, 8) || "GOX";
};

export const hasRealProfileName = (fullName: string | null | undefined): boolean => {
  const value = fullName?.trim() || "";
  if (!value) return false;
  if (/^[0-9a-f]{8,}$/i.test(value)) return false;
  if (/^[0-9a-f-]{20,}$/i.test(value)) return false;
  return true;
};

export const getDefaultCompanyName = (args: {
  fullName: string | null | undefined;
  email: string | null | undefined;
}): string => {
  const displayName = getProfileDisplayName({
    fullName: args.fullName,
    email: args.email,
    companyName: null,
    userId: null,
  }).trim();

  if (displayName && displayName !== "GOX") {
    return `РљРѕРјРїР°РЅРёСЏ ${displayName}`;
  }

  return "РќРѕРІР°СЏ РєРѕРјРїР°РЅРёСЏ";
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "profile_error");

