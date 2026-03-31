import { useMemo } from "react";

import {
  buildProfileAssistantPrompt,
  getProfileDisplayName,
  getProfileRoleColor,
  getProfileRoleLabel,
  hasRealProfileName,
} from "../profile.helpers";
import type { Company, ProfileListingRecord, UserProfile } from "../profile.types";

export const useProfileDerivedState = (params: {
  profile: UserProfile | null;
  company: Company | null;
  profileRole: string | null;
  profileEmail: string | null;
  myListings: ProfileListingRecord[];
  modeMarket: boolean;
  modeBuild: boolean;
}) =>
  useMemo(() => {
    const profileName = getProfileDisplayName({
      fullName: params.profile?.full_name,
      email: params.profileEmail,
      companyName: params.company?.name,
      userId: params.profile?.user_id,
    });
    const roleLabel = getProfileRoleLabel(params.profileRole);
    const roleColor = getProfileRoleColor(params.profileRole);
    const avatarLetter = profileName[0]?.toUpperCase() || "G";
    const accountSubtitle =
      [params.company?.name?.trim(), params.profileEmail].filter(Boolean).join(" В· ") || "РђРєРєР°СѓРЅС‚ GOX";
    const companyCardTitle = params.company?.name?.trim() || "РџРѕРґРєР»СЋС‡РёС‚СЊ РєРѕРјРїР°РЅРёСЋ";
    const companyCardSubtitle = params.company
      ? "РћС‚РєСЂРѕР№С‚Рµ РєР°Р±РёРЅРµС‚ РєРѕРјРїР°РЅРёРё, СЂРµРєРІРёР·РёС‚С‹ Рё РєРѕРјР°РЅРґРЅС‹Рµ С„СѓРЅРєС†РёРё GOX."
      : "РЎРѕР·РґР°Р№С‚Рµ РєР°Р±РёРЅРµС‚ РєРѕРјРїР°РЅРёРё, С‡С‚РѕР±С‹ СЂР°Р±РѕС‚Р°С‚СЊ СЃ СЂРµРєРІРёР·РёС‚Р°РјРё, РІРёС‚СЂРёРЅРѕР№ Рё РїСЂРёРіР»Р°С€РµРЅРёСЏРјРё.";
    const requisitesVisible = Boolean(params.company || params.modeBuild);
    const listingsSummary =
      params.myListings.length > 0
        ? `${params.myListings.length} Р°РєС‚РёРІРЅС‹С… РѕР±СЉСЏРІР»РµРЅРёР№ РІ РїСЂРѕС„РёР»Рµ`
        : "РћР±СЉСЏРІР»РµРЅРёР№ РїРѕРєР° РЅРµС‚";
    const profileCompletionItems = [
      { key: "name", label: "РРјСЏ", done: hasRealProfileName(params.profile?.full_name) },
      { key: "phone", label: "РўРµР»РµС„РѕРЅ", done: Boolean(params.profile?.phone?.trim()) },
      { key: "city", label: "Р“РѕСЂРѕРґ", done: Boolean(params.profile?.city?.trim()) },
    ];
    const profileCompletionDone = profileCompletionItems.filter((item) => item.done).length;
    const profileCompletionPercent = Math.round((profileCompletionDone / profileCompletionItems.length) * 100);
    const companyCompletionItems = [
      { key: "mode", label: "Р РµР¶РёРј РєРѕРјРїР°РЅРёРё", done: params.modeBuild },
      { key: "name", label: "РќР°Р·РІР°РЅРёРµ", done: Boolean(params.company?.name?.trim()) },
      { key: "city", label: "Р“РѕСЂРѕРґ", done: Boolean(params.company?.city?.trim()) },
      { key: "address", label: "РђРґСЂРµСЃ", done: Boolean(params.company?.address?.trim()) },
      {
        key: "phone",
        label: "РљРѕРЅС‚Р°РєС‚",
        done: Boolean(params.company?.phone_main?.trim() || params.profile?.phone?.trim()),
      },
      { key: "inn", label: "РРќРќ", done: Boolean(params.company?.inn?.trim()) },
    ];
    const companyCompletionDone = companyCompletionItems.filter((item) => item.done).length;
    const companyCompletionPercent = Math.round((companyCompletionDone / companyCompletionItems.length) * 100);
    const assistantListings = params.myListings.map((item) => ({
      id: String(item?.id ?? ""),
      title: String(item?.title ?? "РћР±СЉСЏРІР»РµРЅРёРµ"),
      kind: typeof item?.kind === "string" ? item.kind : null,
      city: typeof item?.city === "string" ? item.city : null,
      price: typeof item?.price === "number" || typeof item?.price === "string" ? item.price : null,
      status: typeof item?.status === "string" ? item.status : null,
    }));
    const assistantPrompt = buildProfileAssistantPrompt({
      profileName,
      city: params.company?.city || params.profile?.city,
      companyName: params.company?.name,
      modeMarket: params.modeMarket,
      modeBuild: params.modeBuild,
      listings: assistantListings,
    });

    return {
      profileName,
      roleLabel,
      roleColor,
      avatarLetter,
      accountSubtitle,
      companyCardTitle,
      companyCardSubtitle,
      requisitesVisible,
      listingsSummary,
      profileCompletionItems,
      profileCompletionDone,
      profileCompletionPercent,
      companyCompletionItems,
      companyCompletionDone,
      companyCompletionPercent,
      assistantPrompt,
    };
  }, [
    params.company,
    params.modeBuild,
    params.modeMarket,
    params.myListings,
    params.profile,
    params.profileEmail,
    params.profileRole,
  ]);
