// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking,           // ← ДОБАВЬ
} from "react-native";
import * as Clipboard from "expo-clipboard"; // ← НОВЫЙ ИМПОРТ
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabaseClient";
import { getMyRole } from "../../src/lib/api/profile";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UI = {
  bg: "#020617",
  card: "#0F172A",
  cardSoft: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#22C55E",
  accentSoft: "rgba(34,197,94,0.12)",
};

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  usage_market: boolean;
  usage_build: boolean;

  bio?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  position?: string | null;
};

type Company = {
  id: string;
  owner_user_id: string;
  name: string;
  city: string | null;

  legal_form?: string | null;
  address?: string | null;
  industry?: string | null;
  employees_count?: number | null;
  about_short?: string | null;

  phone_main?: string | null;
  phone_whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  telegram?: string | null;
  work_time?: string | null;
  contact_person?: string | null;

  about_full?: string | null;
  services?: string | null;
  regions?: string | null;
  clients_types?: string | null;

  inn?: string | null;
  bin?: string | null;
  reg_number?: string | null;
  bank_details?: string | null;
  licenses_info?: string | null;
};

type ListingCartItem = {
  id: string;
  rik_code: string | null;
  name: string;
  uom: string | null;
  qty: string;
  price: string;
  city: string | null;
  kind: "material" | "service" | "rent" | null; // тип этой позиции
};

type CompanyTab = "main" | "contacts" | "about" | "docs";
type ProfileMode = "person" | "company" | null;

type ProfileListingSummary = {
  id: string;
  title: string;
  kind: string | null;
  city: string | null;
  price: string | number | null;
  status: string | null;
};

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return `GB-${code}`;
}

function getListingKindLabel(kind: string | null): string {
  switch (kind) {
    case "material":
      return "материалы";
    case "service":
      return "услуги";
    case "rent":
      return "аренда";
    default:
      return "объявления";
  }
}

function buildProfileAssistantPrompt(args: {
  profileName: string;
  city: string | null | undefined;
  companyName: string | null | undefined;
  modeMarket: boolean;
  modeBuild: boolean;
  listings: ProfileListingSummary[];
}): string {
  const parts: string[] = [
    `Помоги мне с интегрированным профилем GOX. Меня зовут ${args.profileName}.`,
  ];

  if (args.companyName) {
    parts.push(`Компания: ${args.companyName}.`);
  }

  if (args.city) {
    parts.push(`Город: ${args.city}.`);
  }

  parts.push(
    `Режим объявлений: ${args.modeMarket ? "включен" : "выключен"}. Режим компании: ${
      args.modeBuild ? "включен" : "выключен"
    }.`,
  );

  if (args.listings.length > 0) {
    const listingSummary = args.listings
      .slice(0, 3)
      .map((item) => {
        const price =
          item.price != null && String(item.price).trim()
            ? `, цена ${String(item.price)}`
            : "";
        const city = item.city ? `, ${item.city}` : "";
        const status = item.status ? `, статус ${item.status}` : "";
        return `${item.title} (${getListingKindLabel(item.kind)}${city}${price}${status})`;
      })
      .join("; ");

    parts.push(`Мои объявления: ${listingSummary}.`);
    parts.push(
      "Подскажи, как лучше использовать витрину поставщика, карту и AI внутри текущего приложения без изменения бизнес-логики.",
    );
  } else {
    parts.push(
      "У меня пока нет опубликованных объявлений. Подскажи, с чего начать витрину поставщика и как связать ее с картой и AI внутри текущего приложения.",
    );
  }

  return parts.join(" ");
}

function getProfileRoleLabel(role: string | null): string {
  switch (String(role || "").trim()) {
    case "director":
      return "Директор";
    case "buyer":
      return "Снабженец";
    case "foreman":
      return "Прораб";
    case "warehouse":
      return "Склад";
    case "accountant":
      return "Бухгалтер";
    case "security":
      return "Безопасность";
    case "contractor":
      return "Подрядчик";
    default:
      return "Профиль GOX";
  }
}

function getProfileRoleColor(role: string | null): string {
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
      return UI.accent;
  }
}

function getProfileDisplayName(args: {
  fullName: string | null | undefined;
  email: string | null | undefined;
  companyName: string | null | undefined;
  userId: string | null | undefined;
}): string {
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
}

function hasRealProfileName(fullName: string | null | undefined): boolean {
  const value = fullName?.trim() || "";
  if (!value) return false;
  if (/^[0-9a-f]{8,}$/i.test(value)) return false;
  if (/^[0-9a-f-]{20,}$/i.test(value)) return false;
  return true;
}

function getDefaultCompanyName(args: {
  fullName: string | null | undefined;
  email: string | null | undefined;
}): string {
  const displayName = getProfileDisplayName({
    fullName: args.fullName,
    email: args.email,
    companyName: null,
    userId: null,
  }).trim();

  if (displayName && displayName !== "GOX") {
    return `Компания ${displayName}`;
  }

  return "Новая компания";
}

async function uploadProfileAvatar(userId: string, assetUri: string): Promise<string> {
  const timestamp = Date.now();
  let extension = "jpg";
  let contentType = "image/jpeg";
  let filePath = `${userId}/${timestamp}.${extension}`;

  if (Platform.OS === "web") {
    const response = await fetch(assetUri);
    const blob = await response.blob();
    const blobType = blob.type || "";

    if (blobType.includes("png")) {
      extension = "png";
      contentType = "image/png";
    } else if (blobType.includes("webp")) {
      extension = "webp";
      contentType = "image/webp";
    } else if (blobType.includes("jpeg") || blobType.includes("jpg")) {
      extension = "jpg";
      contentType = "image/jpeg";
    }

    filePath = `${userId}/${timestamp}.${extension}`;
    const upload = await supabase.storage.from("avatars").upload(filePath, blob, {
      contentType,
      upsert: true,
    });
    if (upload.error) throw upload.error;
  } else {
    const FileSystemModule = await import("expo-file-system/legacy");
    const FS: any = FileSystemModule;
    const uriExtMatch = /\.(png|jpg|jpeg|webp)$/i.exec(assetUri);

    if (uriExtMatch?.[1]) {
      const ext = uriExtMatch[1].toLowerCase();
      extension = ext === "jpeg" ? "jpg" : ext;
      contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
    }

    filePath = `${userId}/${timestamp}.${extension}`;
    const base64 = await FS.readAsStringAsync(assetUri, {
      encoding: "base64" as any,
    });
    const upload = await supabase.storage.from("avatars").upload(filePath, decode(base64), {
      contentType,
      upsert: true,
    });
    if (upload.error) throw upload.error;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

export default function ProfileScreen() {
  const router = useRouter();

  const [profileMode, setProfileMode] = useState<ProfileMode>(null);

  const [loading, setLoading] = useState(true);
  const [savingUsage, setSavingUsage] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileAvatarDraft, setProfileAvatarDraft] = useState<string | null>(null);
  const [, setSigningOut] = useState(false);

  // ===== Мои объявления =====
  const [myListings, setMyListings] = useState<any[]>([]);

  // ===== КОРЗИНА ПОЗИЦИЙ ДЛЯ ОБЪЯВЛЕНИЯ =====
  const [listingCartItems, setListingCartItems] = useState<ListingCartItem[]>(
    []
  );
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListingCartItem | null>(null);

  const [modeMarket, setModeMarket] = useState(true);
  const [modeBuild, setModeBuild] = useState(false);

  // модалки
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);

  // wizard компании
  const [businessOnboardingOpen, setBusinessOnboardingOpen] =
    useState(false);
  const [businessStep, setBusinessStep] = useState<1 | 2 | 3>(1);

  // вкладки компании
  const [companyTab, setCompanyTab] = useState<CompanyTab>("main");

  // формы профиля
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profilePhoneInput, setProfilePhoneInput] = useState("");
  const [profileCityInput, setProfileCityInput] = useState("");
  const [profileBioInput, setProfileBioInput] = useState("");
  const [profileTelegramInput, setProfileTelegramInput] = useState("");
  const [profileWhatsappInput, setProfileWhatsappInput] = useState("");
  const [profilePositionInput, setProfilePositionInput] = useState("");

  // формы компании (используются и в wizard, и в модалке редактирования)
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [companyCityInput, setCompanyCityInput] = useState("");
  const [companyLegalFormInput, setCompanyLegalFormInput] = useState("");
  const [companyAddressInput, setCompanyAddressInput] = useState("");
  const [companyIndustryInput, setCompanyIndustryInput] = useState("");
  const [companyAboutShortInput, setCompanyAboutShortInput] =
    useState("");

  const [companyPhoneMainInput, setCompanyPhoneMainInput] = useState("");
  const [companyPhoneWhatsAppInput, setCompanyPhoneWhatsAppInput] =
    useState("");
  const [companyEmailInput, setCompanyEmailInput] = useState("");
  const [companySiteInput, setCompanySiteInput] = useState("");
  const [companyTelegramInput, setCompanyTelegramInput] = useState("");
  const [companyWorkTimeInput, setCompanyWorkTimeInput] = useState("");
  const [companyContactPersonInput, setCompanyContactPersonInput] =
    useState("");

  const [companyAboutFullInput, setCompanyAboutFullInput] = useState("");
  const [companyServicesInput, setCompanyServicesInput] = useState("");
  const [companyRegionsInput, setCompanyRegionsInput] = useState("");
  const [companyClientsTypesInput, setCompanyClientsTypesInput] =
    useState("");

  const [companyInnInput, setCompanyInnInput] = useState("");
  const [companyBinInput, setCompanyBinInput] = useState("");
  const [companyRegNumberInput, setCompanyRegNumberInput] = useState("");
  const [companyBankDetailsInput, setCompanyBankDetailsInput] =
    useState("");
  const [companyLicensesInfoInput, setCompanyLicensesInfoInput] =
    useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [justCreatedCompany, setJustCreatedCompany] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("foreman");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteComment, setInviteComment] = useState("");
  const [savingInvite, setSavingInvite] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);
  const [lastInvitePhone, setLastInvitePhone] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState(""); // ← ДОБАВЬ ЭТО
  // ===== ОБЪЯВЛЕНИЯ (market_listings) =====
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingCity, setListingCity] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingUom, setListingUom] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingPhone, setListingPhone] = useState("");
  const [listingWhatsapp, setListingWhatsapp] = useState("");
  const [listingEmail, setListingEmail] = useState("");
  const [savingListing, setSavingListing] = useState(false);
  const [listingKind, setListingKind] =
    useState<"material" | "service" | "rent" | null>(null);
  const [listingRikCode, setListingRikCode] = useState<string | null>(null);
  // ===== КАТАЛОГ (выбор позиции из catalog_items) =====
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<
    { rik_code: string; name_human_ru: string | null; uom_code: string | null; kind: string }[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // ===== ЗАГРУЗКА ПРОФИЛЯ И КОМПАНИИ =====
  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      try {
        setLoading(true);
        const { data: userRes, error: userErr } =
          await supabase.auth.getUser();
        if (userErr || !userRes?.user) {
          throw userErr || new Error("Не найден текущий пользователь");
        }
        const user = userRes.user;
        setProfileEmail(user.email ?? null);
        setProfileAvatarUrl(
          typeof (user.user_metadata as any)?.avatar_url === "string"
            ? (user.user_metadata as any).avatar_url
            : null
        );
        setProfileRole(await getMyRole());

        // Профиль
        const { data: profData, error: profErr } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!alive) return;

        let p: UserProfile;
        if (profErr && (profErr as any).code !== "PGRST116") {
          console.warn("user_profiles error:", profErr);
          throw profErr;
        }

        if (profData) {
          p = profData as UserProfile;
        } else {
          p = {
            id: "",
            user_id: user.id,
            full_name:
              (user.user_metadata as any)?.full_name ||
              user.email ||
              "Профиль GOX",
            phone: (user.phone as string | null) ?? null,
            city: null,
            usage_market: true,
            usage_build: false,
            bio: null,
            telegram: null,
            whatsapp: null,
            position: null,
          };
        }

        setProfile(p);
        setModeMarket(p.usage_market);
        setModeBuild(p.usage_build);

        // Компания
        const { data: compData, error: compErr } = await supabase
          .from("companies")
          .select("*")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (!alive) return;
        if (compErr && (compErr as any).code !== "PGRST116") {
          console.warn("companies error:", compErr);
          throw compErr;
        }

        if (compData) {
          setCompany(compData as Company);
          setProfileMode("company");
        } else {
          setCompany(null);
          setProfileMode("person");
        }
        // === Загружаем мои объявления ===
        const { data: listingsData, error: listingsErr } = await supabase
          .from("market_listings")
          .select("id,title,kind,city,price,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!alive) return;
        if (listingsErr) {
          console.warn("myListings error:", listingsErr);
        } else {
          setMyListings(listingsData || []);
        }

      } catch (e: any) {
        if (!alive) return;
        console.warn("loadAll error:", e?.message || e);
        Alert.alert("Профиль", e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAll();
    return () => {
      alive = false;
    };
  }, []);

  // ===== СОХРАНЕНИЕ РЕЖИМОВ ИСПОЛЬЗОВАНИЯ =====
  const updateUsage = async (nextMarket: boolean, nextBuild: boolean) => {
    setModeMarket(nextMarket);
    setModeBuild(nextBuild);

    if (!profile) return;

    try {
      setSavingUsage(true);
      const payload = {
        id: profile.id || undefined,
        user_id: profile.user_id,
        full_name: profile.full_name,
        phone: profile.phone,
        city: profile.city,
        usage_market: nextMarket,
        usage_build: nextBuild,
        bio: profile.bio ?? null,
        telegram: profile.telegram ?? null,
        whatsapp: profile.whatsapp ?? null,
        position: profile.position ?? null,
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (e: any) {
      console.warn("updateUsage error:", e?.message || e);
      Alert.alert("Профиль", e?.message ?? String(e));
    } finally {
      setSavingUsage(false);
    }
  };

  const toggleMarket = () => updateUsage(!modeMarket, modeBuild);

  // ===== ХЕЛПЕР: заполнить форму компании из company/profile =====
  const hydrateCompanyFormFromState = () => {
    setCompanyNameInput(company?.name || "");
    setCompanyCityInput(company?.city || profile?.city || "");

    setCompanyLegalFormInput(company?.legal_form || "");
    setCompanyAddressInput(company?.address || "");
    setCompanyIndustryInput(company?.industry || "");
    setCompanyAboutShortInput(company?.about_short || "");

    setCompanyPhoneMainInput(company?.phone_main || profile?.phone || "");
    setCompanyPhoneWhatsAppInput(company?.phone_whatsapp || "");
    setCompanyEmailInput(company?.email || "");
    setCompanySiteInput(company?.site || "");
    setCompanyTelegramInput(company?.telegram || "");
    setCompanyWorkTimeInput(company?.work_time || "");
    setCompanyContactPersonInput(
      company?.contact_person || profile?.full_name || ""
    );

    setCompanyAboutFullInput(company?.about_full || "");
    setCompanyServicesInput(company?.services || "");
    setCompanyRegionsInput(company?.regions || "");
    setCompanyClientsTypesInput(company?.clients_types || "");

    setCompanyInnInput(company?.inn || "");
    setCompanyBinInput(company?.bin || "");
    setCompanyRegNumberInput(company?.reg_number || "");
    setCompanyBankDetailsInput(company?.bank_details || "");
    setCompanyLicensesInfoInput(company?.licenses_info || "");
  };

  // НОВАЯ ЛОГИКА: если включаем «веду бизнес» — запускаем wizard
  const handlePressBuildCard = () => {
    if (!modeBuild) {
      hydrateCompanyFormFromState();
      setBusinessStep(1);
      setBusinessOnboardingOpen(true);
    } else {
      // уже включён — можно просто выключить
      updateUsage(modeMarket, false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProfileMode("person");
    }
  };

  const closeBusinessWizard = () => {
    setBusinessOnboardingOpen(false);
    setBusinessStep(1);
  };

  const goNextBusinessStep = () => {
    if (businessStep < 3) {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut
      );
      setBusinessStep((businessStep + 1) as 1 | 2 | 3);
    }
  };

  const goPrevBusinessStep = () => {
    if (businessStep > 1) {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut
      );
      setBusinessStep((businessStep - 1) as 1 | 2 | 3);
    }
  };

  const submitBusinessWizard = async () => {
    try {
      setSavingCompany(true);

      const { data: userRes, error: userErr } =
        await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        throw userErr || new Error("Не найден текущий пользователь");
      }
      const user = userRes.user;

      let comp = company;
      const fallbackCompanyName = getDefaultCompanyName({
        fullName: profile?.full_name,
        email: profileEmail,
      });

      const basePayload = {
        owner_user_id: user.id,
        name: companyNameInput.trim() || fallbackCompanyName,
        city: companyCityInput.trim() || null,

        legal_form: companyLegalFormInput.trim() || null,
        address: companyAddressInput.trim() || null,
        industry: companyIndustryInput.trim() || null,
        about_short: companyAboutShortInput.trim() || null,

        phone_main: companyPhoneMainInput.trim() || null,
        phone_whatsapp: companyPhoneWhatsAppInput.trim() || null,
        email: companyEmailInput.trim() || null,
        site: companySiteInput.trim() || null,
        telegram: companyTelegramInput.trim() || null,
        work_time: companyWorkTimeInput.trim() || null,
        contact_person: companyContactPersonInput.trim() || null,

        about_full: companyAboutFullInput.trim() || null,
        services: companyServicesInput.trim() || null,
        regions: companyRegionsInput.trim() || null,
        clients_types: companyClientsTypesInput.trim() || null,

        inn: companyInnInput.trim() || null,
        bin: companyBinInput.trim() || null,
        reg_number: companyRegNumberInput.trim() || null,
        bank_details: companyBankDetailsInput.trim() || null,
        licenses_info: companyLicensesInfoInput.trim() || null,
      };

      if (!comp) {
        const { data: created, error: insErr } = await supabase
          .from("companies")
          .insert(basePayload)
          .select()
          .single();

        if (insErr) throw insErr;
        comp = created as Company;
      } else {
        const { data: updated, error: updErr } = await supabase
          .from("companies")
          .update(basePayload)
          .eq("id", comp.id)
          .select()
          .single();

        if (updErr) throw updErr;
        comp = updated as Company;
      }

      // сохраняем в стейт
      setCompany(comp);

      // включаем режим бизнеса в профиле
      await updateUsage(modeMarket, true);

      // отмечаем, что компания только что создана
      setJustCreatedCompany(true);

      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut
      );
      setProfileMode("company");
      setBusinessOnboardingOpen(false);
      setBusinessStep(1);
    } catch (e: any) {
      Alert.alert("Компания", e?.message ?? String(e));
    } finally {
      setSavingCompany(false);
    }
  };

  // ===== ОТКРЫТЬ / СОЗДАТЬ КАБИНЕТ КОМПАНИИ ПО КНОПКЕ =====
  const openCompanyCabinet = async () => {
    try {
      setSavingUsage(true);

      const { data: userRes, error: userErr } =
        await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        throw userErr || new Error("Не найден текущий пользователь");
      }

      const user = userRes.user;

      let comp = company;

      if (!comp) {
        const companyName = getDefaultCompanyName({
          fullName: profile?.full_name,
          email: profileEmail,
        });

        const { data: created, error: insErr } = await supabase
          .from("companies")
          .insert({
            owner_user_id: user.id,
            name: companyName,
            city: profile?.city,
          })
          .select()
          .single();

        if (insErr) throw insErr;
        comp = created as Company;
        setCompany(comp);
      }

      const { error: memErr } = await supabase
        .from("company_members")
        .upsert(
          {
            company_id: comp.id,
            user_id: user.id,
            role: "director",
          },
          { onConflict: "company_id,user_id" }
        );

      if (memErr) throw memErr;

      router.push("/director");
    } catch (e: any) {
      console.warn("openCompanyCabinet error:", e?.message || e);
      Alert.alert("Кабинет компании", e?.message ?? String(e));
    } finally {
      setSavingUsage(false);
    }
  };

  // ===== ОБЪЯВЛЕНИЯ: открыть модалку =====
  const openListingModal = () => {
    if (!profile) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setListingTitle("");

    // базовый город: если режим "компания" — берём город компании, иначе профиль
    const baseCity =
      profileMode === "company"
        ? company?.city || profile.city || ""
        : profile.city || "";

    // базовый телефон: у компании -> company.phone_main, иначе профильный телефон
    const basePhone =
      profileMode === "company"
        ? company?.phone_main || profile.phone || ""
        : profile.phone || "";

    setListingCity(baseCity);
    setListingPrice("");
    setListingUom("");
    setListingDescription("");

    setListingPhone(basePhone);
    setListingWhatsapp(profile?.whatsapp || basePhone);
    setListingEmail(""); // почту пока заполняет сам пользователь
    setListingKind(null); // ← СБРОС ТИПА

    setListingRikCode(null); // ← сбросить привязку к каталогу
    setListingCartItems([]); // ← чистим корзину
    setEditingItem(null);    // ← сбрасываем редактируемую позицию

    setListingModalOpen(true);
  };

  // ===== ОБЪЯВЛЕНИЯ: опубликовать =====
  const publishListing = async () => {
    if (!listingTitle.trim()) {
      Alert.alert("Объявление", "Укажите заголовок объявления.");
      return;
    }

    if (!listingKind) {
      Alert.alert(
        "Объявление",
        "Выберите тип объявления: материалы, услуги или аренда."
      );
      return;
    }

    try {
      setSavingListing(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        throw userErr || new Error(
          "Нужно войти в аккаунт, чтобы подать объявление."
        );
      }
      const user = userRes.user;

      // 1) Цена
      let priceNumber: number | null = null;
      if (listingPrice.trim() !== "") {
        const cleaned = listingPrice.replace(/\s/g, "").replace(",", ".");
        const parsed = Number(cleaned);
        if (Number.isNaN(parsed)) {
          Alert.alert("Объявление", "Цена указана некорректно.");
          return;
        }
        priceNumber = parsed;
      }

      // 2) Проверяем, что есть хотя бы один контакт
      if (
        !listingPhone.trim() &&
        !listingWhatsapp.trim() &&
        !listingEmail.trim()
      ) {
        Alert.alert(
          "Объявление",
          "Укажите хотя бы один контакт: телефон, WhatsApp или email."
        );
        return;
      }

      // 3) ОБЯЗАТЕЛЬНО получаем геолокацию
      let lat: number | null = null;
      let lng: number | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Геолокация",
          "Разрешите доступ к местоположению, чтобы разместить объявление на карте."
        );
        return; // не создаём объявление
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,

        });

        const { latitude, longitude } = loc.coords;
        lat = latitude;
        lng = longitude;
      } catch {
        Alert.alert(
          "Геолокация",
          "Не удалось автоматически определить местоположение. Попробуйте ещё раз."
        );
        return; // не создаём объявление
      }

      if (lat == null || lng == null) {
        Alert.alert(
          "Геолокация",
          "Не удалось получить координаты. Объявление не будет размещено."
        );
        return;
      }

      // Собираем корзину позиций для items_json
      const itemsPayload = listingCartItems.map((it) => ({
        rik_code: it.rik_code,
        name: it.name,
        uom: it.uom,
        qty: Number(it.qty.replace(",", ".")) || 0,
        price: Number(it.price.replace(",", ".")) || 0,
        city: it.city,
        kind: it.kind,
      }));

      // Определяем общий тип объявления по позициям
      let finalKind = listingKind;
      if (!finalKind && listingCartItems.length > 0) {
        const kinds = Array.from(
          new Set(
            listingCartItems
              .map((it) => it.kind)
              .filter(
                (k): k is "material" | "service" | "rent" => !!k
              )
          )
        );

        if (kinds.length === 1) {
          finalKind = kinds[0]; // все позиции одного типа
        } else if (kinds.length > 1) {
          finalKind = "mixed" as any; // смешанный тип
        }
      }

      const { error: insertErr } = await supabase
        .from("market_listings")
        .insert({
          user_id: user.id,
          company_id:
            profileMode === "company" && company ? company.id : null,

          kind: finalKind || listingKind || null,
          title: listingTitle.trim(),
          description: listingDescription.trim() || null,
          price: priceNumber,
          currency: "KGS",
          uom: listingUom.trim() || null,
          city: listingCity.trim() || null,

          contacts_phone: listingPhone.trim() || null,
          contacts_whatsapp: listingWhatsapp.trim() || null,
          contacts_email: listingEmail.trim() || null,

          status: "active",
          lat,
          lng,

          rik_code: listingRikCode,
          items_json: itemsPayload,
        });

      if (insertErr) throw insertErr;

      setListingModalOpen(false);

      Alert.alert(
        "Объявление опубликовано",
        "Ваше объявление уже видно в витрине и на карте.",
        [
          {
            text: "Открыть витрину",
            onPress: () => router.push("/supplierShowcase"),
          },
          { text: "Ок", style: "cancel" },
        ]
      );
    } catch (e: any) {
      Alert.alert("Объявление", e?.message ?? String(e));
    } finally {
      setSavingListing(false);
    }
  };

  // ===== Встроенный поиск по каталогу под полем "Позиция" =====
  const searchCatalogInline = async (term: string) => {
    const q = term.trim();

    // Если меньше 2 символов — очищаем подсказки и не дёргаем базу
    if (q.length < 2) {
      setCatalogResults([]);
      return;
    }

    try {
      setCatalogLoading(true);

      let query = supabase
        .from("catalog_items")
        .select("rik_code, name_human_ru, uom_code, kind")
        .limit(15);

      // Материалы → только kind = 'material'
      if (listingKind === "material") {
        query = query.eq("kind", "material");
      }

      // Услуги → только kind = 'work'
      if (listingKind === "service") {
        query = query.eq("kind", "work");
      }

      // Аренда → пока ищем по всему каталогу (можно позже сделать свой справочник)
      query = query.ilike("name_human_ru", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      setCatalogResults(
        (data || []).map((row: any) => ({
          rik_code: row.rik_code,
          name_human_ru: row.name_human_ru,
          uom_code: row.uom_code,
          kind: row.kind,
        }))
      );
    } catch (e) {
      console.warn("searchCatalogInline error:", e);
    } finally {
      setCatalogLoading(false);
    }
  };

  // ===== КАТАЛОГ: загрузка позиций из catalog_items =====
  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);

      // Базовый запрос
      let query = supabase
        .from("catalog_items")
        .select("rik_code, name_human_ru, uom_code, kind")
        .limit(50);

      // Если явно выбраны "Материалы" -> фильтруем только материалы
      if (listingKind === "material") {
        query = query.eq("kind", "material");
      }

      // Если выбраны "Услуги" -> фильтруем только работы
      if (listingKind === "service") {
        query = query.eq("kind", "work");
      }

      // Если "Аренда" или тип не выбран — не фильтруем по kind, ищем по всему каталогу

      if (catalogSearch.trim()) {
        const term = catalogSearch.trim();
        query = query.ilike("name_human_ru", `%${term}%`);

      }

      const { data, error } = await query;
      if (error) throw error;

      setCatalogResults(
        (data || []).map((row: any) => ({
          rik_code: row.rik_code,
          name_human_ru: row.name_human_ru,
          uom_code: row.uom_code,
          kind: row.kind,
        }))
      );
    } catch (e: any) {
      Alert.alert("Каталог", e?.message ?? String(e));
    } finally {
      setCatalogLoading(false);
    }
  };

  // ===== МОДАЛКА РЕДАКТИРОВАНИЯ ПРОФИЛЯ =====
  const openEditProfile = () => {
    if (!profile) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProfileNameInput(profile.full_name || "");
    setProfilePhoneInput(profile.phone || "");
    setProfileCityInput(profile.city || "");
    setProfileBioInput(profile.bio || "");
    setProfileTelegramInput(profile.telegram || "");
    setProfileWhatsappInput(profile.whatsapp || "");
    setProfilePositionInput(profile.position || "");
    setProfileAvatarDraft(profileAvatarUrl);
    setEditProfileOpen(true);
  };

  const closeEditProfile = () => {
    setProfileAvatarDraft(profileAvatarUrl);
    setEditProfileOpen(false);
  };

  const pickProfileAvatar = async () => {
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Профиль", "Разрешите доступ к фото, чтобы загрузить аватар.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setProfileAvatarDraft(result.assets[0]?.uri ?? null);
      }
    } catch (e: any) {
      Alert.alert("Профиль", e?.message ?? "Не удалось выбрать изображение.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Выйти из аккаунта", "Завершить текущий сеанс GOX?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          try {
            setSigningOut(true);
            const result = await supabase.auth.signOut();
            if (result.error) throw result.error;
            router.replace("/auth/login" as any);
          } catch (e: any) {
            Alert.alert("Профиль", e?.message ?? String(e));
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const saveProfileModal = async () => {
    if (!profile) return;
    try {
      setSavingProfile(true);
      let nextAvatarUrl = profileAvatarUrl;

      if (
        profile.user_id &&
        profileAvatarDraft &&
        profileAvatarDraft !== profileAvatarUrl
      ) {
        nextAvatarUrl = await uploadProfileAvatar(profile.user_id, profileAvatarDraft);
      }

      const payload = {
        id: profile.id || undefined,
        user_id: profile.user_id,
        full_name: profileNameInput.trim() || null,
        phone: profilePhoneInput.trim() || null,
        city: profileCityInput.trim() || null,
        usage_market: modeMarket,
        usage_build: modeBuild,
        bio: profileBioInput.trim() || null,
        telegram: profileTelegramInput.trim() || null,
        whatsapp: profileWhatsappInput.trim() || null,
        position: profilePositionInput.trim() || null,
      };

      const authUpdate = await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          city: payload.city,
          avatar_url: nextAvatarUrl,
        } as any,
      });
      if (authUpdate.error) throw authUpdate.error;

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      setProfileAvatarUrl(nextAvatarUrl);
      setProfileAvatarDraft(nextAvatarUrl);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      closeEditProfile();
    } catch (e: any) {
      Alert.alert("Профиль", e?.message ?? String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  // ===== МОДАЛКА РЕДАКТИРОВАНИЯ КОМПАНИИ (ПОСЛЕ СОЗДАНИЯ) =====
  const openEditCompany = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hydrateCompanyFormFromState();
    setCompanyTab("main");
    setEditCompanyOpen(true);
  };

  const saveCompanyModal = async () => {
    try {
      setSavingCompany(true);

      const { data: userRes, error: userErr } =
        await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        throw userErr || new Error("Не найден текущий пользователь");
      }
      const user = userRes.user;

      let comp = company;
      const fallbackCompanyName = getDefaultCompanyName({
        fullName: profile?.full_name,
        email: profileEmail,
      });

      const basePayload = {
        owner_user_id: user.id,
        name: companyNameInput.trim() || fallbackCompanyName,
        city: companyCityInput.trim() || null,

        legal_form: companyLegalFormInput.trim() || null,
        address: companyAddressInput.trim() || null,
        industry: companyIndustryInput.trim() || null,
        about_short: companyAboutShortInput.trim() || null,

        phone_main: companyPhoneMainInput.trim() || null,
        phone_whatsapp: companyPhoneWhatsAppInput.trim() || null,
        email: companyEmailInput.trim() || null,
        site: companySiteInput.trim() || null,
        telegram: companyTelegramInput.trim() || null,
        work_time: companyWorkTimeInput.trim() || null,
        contact_person: companyContactPersonInput.trim() || null,

        about_full: companyAboutFullInput.trim() || null,
        services: companyServicesInput.trim() || null,
        regions: companyRegionsInput.trim() || null,
        clients_types: companyClientsTypesInput.trim() || null,

        inn: companyInnInput.trim() || null,
        bin: companyBinInput.trim() || null,
        reg_number: companyRegNumberInput.trim() || null,
        bank_details: companyBankDetailsInput.trim() || null,
        licenses_info: companyLicensesInfoInput.trim() || null,
      };

      if (!comp) {
        const { data: created, error: insErr } = await supabase
          .from("companies")
          .insert(basePayload)
          .select()
          .single();

        if (insErr) throw insErr;
        comp = created as Company;
      } else {
        const { data: updated, error: updErr } = await supabase
          .from("companies")
          .update(basePayload)
          .eq("id", comp.id)
          .select()
          .single();

        if (updErr) throw updErr;
        comp = updated as Company;
      }

      setCompany(comp);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditCompanyOpen(false);
    } catch (e: any) {
      Alert.alert("Компания", e?.message ?? String(e));
    } finally {
      setSavingCompany(false);
    }
  };

  const profileName = getProfileDisplayName({
    fullName: profile?.full_name,
    email: profileEmail,
    companyName: company?.name,
    userId: profile?.user_id,
  });
  const roleLabel = getProfileRoleLabel(profileRole);
  const roleColor = getProfileRoleColor(profileRole);
  const avatarLetter = profileName[0]?.toUpperCase() || "G";
  const accountSubtitle =
    [company?.name?.trim(), profileEmail].filter(Boolean).join(" · ") ||
    "Аккаунт GOX";
  const companyCardTitle = company?.name?.trim() || "Подключить компанию";
  const companyCardSubtitle = company
    ? "Откройте кабинет компании, реквизиты и командные функции GOX."
    : "Создайте кабинет компании, чтобы работать с реквизитами, витриной и приглашениями.";
  const requisitesVisible = Boolean(company || modeBuild);
  const listingsSummary =
    myListings.length > 0
      ? `${myListings.length} активных объявлений в профиле`
      : "Объявлений пока нет";
  const profileCompletionItems = [
    { key: "name", label: "Имя", done: hasRealProfileName(profile?.full_name) },
    { key: "phone", label: "Телефон", done: Boolean(profile?.phone?.trim()) },
    { key: "city", label: "Город", done: Boolean(profile?.city?.trim()) },
  ];
  const profileCompletionDone = profileCompletionItems.filter((item) => item.done).length;
  const profileCompletionPercent = Math.round(
    (profileCompletionDone / profileCompletionItems.length) * 100,
  );
  const companyCompletionItems = [
    { key: "mode", label: "Режим компании", done: modeBuild },
    { key: "name", label: "Название", done: Boolean(company?.name?.trim()) },
    { key: "city", label: "Город", done: Boolean(company?.city?.trim()) },
    { key: "address", label: "Адрес", done: Boolean(company?.address?.trim()) },
    {
      key: "phone",
      label: "Контакт",
      done: Boolean(company?.phone_main?.trim() || profile?.phone?.trim()),
    },
    { key: "inn", label: "ИНН", done: Boolean(company?.inn?.trim()) },
  ];
  const companyCompletionDone = companyCompletionItems.filter((item) => item.done).length;
  const companyCompletionPercent = Math.round(
    (companyCompletionDone / companyCompletionItems.length) * 100,
  );

  const openProfileAssistant = () => {
    const listings = (myListings || []).map((item) => ({
      id: String(item?.id ?? ""),
      title: String(item?.title ?? "Объявление"),
      kind: typeof item?.kind === "string" ? item.kind : null,
      city: typeof item?.city === "string" ? item.city : null,
      price:
        typeof item?.price === "number" || typeof item?.price === "string"
          ? item.price
          : null,
      status: typeof item?.status === "string" ? item.status : null,
    }));

    const prompt = buildProfileAssistantPrompt({
      profileName,
      city: company?.city || profile?.city,
      companyName: company?.name,
      modeMarket,
      modeBuild,
      listings,
    });

    router.push({
      pathname: "/(tabs)/ai",
      params: { prompt, autoSend: "1", context: "profile" },
    } as any);
  };

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Загружаем профиль…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* ВЫБОР РЕЖИМА ПРОФИЛЯ */}
        <View style={styles.profileHeaderCard}>
          <Pressable
            onPress={openEditProfile}
            style={styles.profileHeaderAvatarWrap}
          >
            <View
              style={[
                styles.profileHeaderAvatar,
                { backgroundColor: `${roleColor}22`, borderColor: `${roleColor}55` },
              ]}
            >
              {profileAvatarUrl ? (
                <Image
                  source={{ uri: profileAvatarUrl }}
                  style={styles.profileHeaderAvatarImage}
                />
              ) : (
                <Text style={styles.profileHeaderAvatarText}>{avatarLetter}</Text>
              )}
            </View>
            <View style={styles.profileHeaderBadge}>
              <Ionicons name="camera" size={15} color={UI.accent} />
            </View>
          </Pressable>
          <Text style={styles.profileHeaderName}>{profileName}</Text>
          <View
            style={[
              styles.profileHeaderRoleBadge,
              { backgroundColor: roleColor },
            ]}
          >
            <Text style={styles.profileHeaderRoleText}>{roleLabel}</Text>
          </View>
          <Text style={styles.profileHeaderSubtitle}>{accountSubtitle}</Text>
        </View>

        <View style={styles.profileTitleRow}>
          <View style={styles.profileTitleMeta}>
            <Text style={styles.profileTitle}>Профиль</Text>
            <Text style={styles.profileTitleSubtitle}>
              Личный кабинет, контакты, компания и доступ к модулям GOX.
            </Text>
          </View>
          <Pressable
            style={styles.profileEditButton}
            onPress={openEditProfile}
          >
            <Text style={styles.profileEditButtonText}>Редактировать</Text>
          </Pressable>
        </View>

        <View style={styles.modeSwitchRow}>
          <Pressable
            style={[
              styles.modeSwitchBtn,
              profileMode === "person" && styles.modeSwitchBtnActive,
            ]}
            onPress={() => setProfileMode("person")}
          >
            <Text
              style={[
                styles.modeSwitchText,
                profileMode === "person" && styles.modeSwitchTextActive,
              ]}
            >
              Физическое лицо
            </Text>
            <Text style={styles.modeSwitchSub}>
              Личный профиль, объявления и контакты
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.modeSwitchBtn,
              profileMode === "company" && styles.modeSwitchBtnActive,
            ]}
            onPress={() => setProfileMode("company")}
          >
            <Text
              style={[
                styles.modeSwitchText,
                profileMode === "company" && styles.modeSwitchTextActive,
              ]}
            >
              Компания / бизнес
            </Text>
            <Text style={styles.modeSwitchSub}>
              Кабинет компании, реквизиты и объекты
            </Text>
          </Pressable>
        </View>

        {profileMode === "person" && (
          <>
            <View style={styles.section}>
              <View style={styles.completionCard}>
                <View style={styles.completionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completionTitle}>Готовность профиля</Text>
                    <Text style={styles.completionSubtitle}>
                      Заполненный профиль лучше выглядит в системе и помогает быстрее работать с модулями GOX.
                    </Text>
                  </View>
                  <Text style={styles.completionPercent}>{profileCompletionPercent}%</Text>
                </View>
                <View style={styles.completionBarTrack}>
                  <View
                    style={[
                      styles.completionBarFill,
                      { width: `${profileCompletionPercent}%` },
                    ]}
                  />
                </View>
                <View style={styles.completionList}>
                  {profileCompletionItems.map((item) => (
                    <View key={item.key} style={styles.completionItem}>
                      <Ionicons
                        name={item.done ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={item.done ? UI.accent : UI.sub}
                      />
                      <Text
                        style={[
                          styles.completionItemText,
                          item.done && styles.completionItemTextDone,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
                {profileCompletionDone < profileCompletionItems.length ? (
                  <Pressable style={styles.completionAction} onPress={openEditProfile}>
                    <Text style={styles.completionActionText}>Заполнить профиль</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.profileSectionHeader}>
                <Ionicons name="person-outline" size={18} color={UI.accent} />
                <Text style={styles.profileSectionHeaderText}>Информация</Text>
              </View>
              <View style={styles.sectionCard}>
                <RowItem label="Имя" value={profileName} />
                <RowItem
                  label="Телефон"
                  value={profile?.phone?.trim() || "Не указан"}
                />
                <RowItem label="Email" value={profileEmail || "Не указан"} />
                <RowItem
                  label="Город"
                  value={profile?.city?.trim() || company?.city?.trim() || "Не указан"}
                />
                <RowItem
                  label="Компания"
                  value={company?.name?.trim() || "Не подключена"}
                />
                <RowItem label="Объявления" value={listingsSummary} last />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.profileSectionHeader}>
                <Ionicons name="business-outline" size={18} color={UI.accent} />
                <Text style={styles.profileSectionHeaderText}>Компания и команда</Text>
              </View>
              <Pressable
                style={styles.profileActionCard}
                onPress={company ? openCompanyCabinet : handlePressBuildCard}
              >
                <View style={styles.profileActionTextWrap}>
                  <Text style={styles.profileActionTitle}>{companyCardTitle}</Text>
                  <Text style={styles.profileActionSubtitle}>{companyCardSubtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={UI.sub} />
              </Pressable>

              {lastInviteCode ? (
                <View style={styles.profileHintCard}>
                  <Text style={styles.profileHintTitle}>Последний код приглашения</Text>
                  <Text style={styles.profileHintValue}>{lastInviteCode}</Text>
                  <Text style={styles.profileHintSubtitle}>
                    Используйте код для подключения сотрудников к текущей компании.
                  </Text>
                </View>
              ) : null}
            </View>

            {requisitesVisible && (
              <View style={styles.section}>
                <View style={styles.profileSectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color={UI.accent} />
                  <Text style={styles.profileSectionHeaderText}>Реквизиты</Text>
                </View>
                <View style={styles.sectionCard}>
                  <RowItem
                    label="Компания"
                    value={company?.name?.trim() || "Не указана"}
                  />
                  <RowItem label="ИНН" value={company?.inn?.trim() || "—"} />
                  <RowItem label="Адрес" value={company?.address?.trim() || "—"} />
                  <RowItem
                    label="Банк / реквизиты"
                    value={company?.bank_details?.trim() || "—"}
                  />
                  <RowItem
                    label="Контакт"
                    value={
                      company?.phone_main?.trim() ||
                      profile?.phone?.trim() ||
                      "Не указан"
                    }
                    last
                  />
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.profileSectionHeader}>
                <Ionicons name="settings-outline" size={18} color={UI.accent} />
                <Text style={styles.profileSectionHeaderText}>Настройки и действия</Text>
              </View>
              <View style={styles.sectionCard}>
                <MenuActionRow
                  icon="create-outline"
                  title="Редактировать профиль"
                  subtitle="Откройте текущую форму редактирования имени, телефона и аватара."
                  onPress={openEditProfile}
                />
                <MenuActionRow
                  icon="storefront-outline"
                  title="Маркет и витрина"
                  subtitle="Откройте маркет, витрину поставщика и текущие объявления."
                  onPress={() => router.push("/(tabs)/market" as any)}
                />
                <MenuActionRow
                  icon="add-circle-outline"
                  title="Добавить объявление"
                  subtitle="Откройте текущую форму публикации товара или услуги."
                  onPress={openListingModal}
                />
                <MenuActionRow
                  icon="map-outline"
                  title="Карта спроса и поставщиков"
                  subtitle="Поставщики, спрос и география позиций на карте."
                  onPress={() => router.push("/supplierMap" as any)}
                />
                <MenuActionRow
                  icon="hammer-outline"
                  title="Торги"
                  subtitle="Актуальные торги, позиции и переход к деталям."
                  onPress={() => router.push("/auctions" as any)}
                />
                <MenuActionRow
                  icon="sparkles-outline"
                  title="AI ассистент"
                  subtitle="Контекстный помощник по профилю, витрине и модулям."
                  onPress={openProfileAssistant}
                />
                <MenuActionRow
                  icon="business-outline"
                  title={company ? "Редактировать компанию" : "Создать компанию"}
                  subtitle={
                    company
                      ? "Откройте текущую форму редактирования компании."
                      : "Подключите кабинет компании без смены действующей логики."
                  }
                  onPress={company ? openEditCompany : handlePressBuildCard}
                />
                <MenuActionRow
                  icon="log-out-outline"
                  title="Выйти из аккаунта"
                  subtitle="Завершить текущую сессию и вернуться на экран входа."
                  onPress={handleSignOut}
                  danger
                  last
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.profileSectionHeader}>
                <Ionicons name="options-outline" size={18} color={UI.accent} />
                <Text style={styles.profileSectionHeaderText}>Режим работы в GOX</Text>
              </View>
              <View style={styles.sectionCard}>
                <Pressable
                  style={[
                    styles.modeCard,
                    modeMarket && styles.modeCardActive,
                  ]}
                  onPress={toggleMarket}
                >
                  <View style={styles.modeHeader}>
                    <View
                      style={[
                        styles.modeCheck,
                        modeMarket && styles.modeCheckActive,
                      ]}
                    >
                      {modeMarket && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.modeTitle}>Публикую объявления / услуги</Text>
                  </View>
                  <Text style={styles.modeText}>
                    Продаю материалы, инструмент, технику или предлагаю ремонтные и
                    строительные услуги.
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modeCard,
                    modeBuild && styles.modeCardActive,
                  ]}
                  onPress={handlePressBuildCard}
                >
                  <View style={styles.modeHeader}>
                    <View
                      style={[
                        styles.modeCheck,
                        modeBuild && styles.modeCheckActive,
                      ]}
                    >
                      {modeBuild && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.modeTitle}>Управляю стройкой / бизнесом</Text>
                  </View>
                  <Text style={styles.modeText}>
                    Веду объекты, заявки, снабжение, подрядчиков и учет работ в полном
                    объеме как компания или бригада.
                  </Text>
                </Pressable>

                {savingUsage && (
                  <Text style={styles.savingHint}>Сохраняем настройки…</Text>
                )}
              </View>
            </View>
          </>
        )}
        {profileMode === "company" && (
          <>
            <View style={styles.section}>
              <View style={styles.completionCard}>
                <View style={styles.completionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completionTitle}>Готовность кабинета компании</Text>
                    <Text style={styles.completionSubtitle}>
                      Чем полнее карточка компании, тем чище работают реквизиты, команда и витрина поставщика.
                    </Text>
                  </View>
                  <Text style={styles.completionPercent}>{companyCompletionPercent}%</Text>
                </View>
                <View style={styles.completionBarTrack}>
                  <View
                    style={[
                      styles.completionBarFill,
                      { width: `${companyCompletionPercent}%` },
                    ]}
                  />
                </View>
                <View style={styles.completionList}>
                  {companyCompletionItems.map((item) => (
                    <View key={item.key} style={styles.completionItem}>
                      <Ionicons
                        name={item.done ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={item.done ? UI.accent : UI.sub}
                      />
                      <Text
                        style={[
                          styles.completionItemText,
                          item.done && styles.completionItemTextDone,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={styles.completionAction}
                  onPress={company ? openEditCompany : openCompanyCabinet}
                >
                  <Text style={styles.completionActionText}>
                    {company ? "Заполнить компанию" : "Создать кабинет компании"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Моя компания */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Моя компания</Text>
              <View style={styles.sectionCard}>
                {modeBuild ? (
                  company ? (
                    <>
                      {justCreatedCompany && (
                        <View style={styles.companySuccessBanner}>
                          <Text style={styles.companySuccessTitle}>
                            Кабинет компании создан
                          </Text>
                          <Text style={styles.companySuccessText}>
                            Проверьте данные ниже, пригласите сотрудников
                            или перейдите в кабинет компании.
                          </Text>
                        </View>
                      )}

                      <Text style={styles.companyTitle}>{company.name}</Text>
                      <Text style={styles.companyText}>
                        Вы директор этой компании в GOX.
                        {"\n"}
                        Город: {company.city || "не указан"}.
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Pressable
                          style={styles.companyBtn}
                          onPress={() => {
                            setJustCreatedCompany(false);
                            openCompanyCabinet();
                          }}
                        >
                          <Text style={styles.companyBtnText}>
                            Перейти в кабинет компании
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.companyBtn,
                            styles.companyBtnSecondary,
                          ]}
                          onPress={openEditCompany}
                        >
                          <Text style={styles.companyBtnTextSecondary}>
                            Редактировать компанию
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.companyBtn,
                            styles.companyBtnSecondary,
                          ]}
                          onPress={() => setInviteModalOpen(true)}
                        >
                          <Text style={styles.companyBtnTextSecondary}>
                            Пригласить сотрудников
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.companyTitle}>
                        Кабинет для строительной компании
                      </Text>
                      <Text style={styles.companyText}>
                        Откройте кабинет: добавьте компанию или бригаду,
                        пригласите прорабов, снабженцев и начните вести объекты
                        в GOX.
                      </Text>

                      <Pressable
                        style={[
                          styles.companyBtn,
                          savingUsage && { opacity: 0.7 },
                        ]}
                        onPress={openCompanyCabinet}
                        disabled={savingUsage}
                      >
                        <Text style={styles.companyBtnText}>
                          Открыть кабинет компании
                        </Text>
                      </Pressable>
                    </>
                  )
                ) : (
                  <>
                    <Text style={styles.companyTitle}>
                      Кабинет компании пока не активен
                    </Text>
                    <Text style={styles.companyText}>
                      Чтобы использовать GOX как строительная компания или
                      бригада, включите режим «Управляю стройкой / бизнесом»
                      выше.
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Профиль компании (краткая инфа) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Профиль компании</Text>
              <View style={styles.sectionCard}>
                <RowItem
                  label="Название"
                  value={company?.name || "Не указано"}
                />
                <RowItem
                  label="Город"
                  value={company?.city || profile.city || "Не указан"}
                />
                <RowItem
                  label="Вид деятельности"
                  value={company?.industry || "Не указан"}
                />
                <RowItem
                  label="Телефон"
                  value={company?.phone_main || profile.phone || "Не указан"}
                />
                <RowItem label="Сайт" value={company?.site || "Не указан"} last />
                {modeBuild && (
                  <Pressable
                    style={[
                      styles.companyBtn,
                      styles.companyBtnSecondary,
                      { marginTop: 10 },
                    ]}
                    onPress={openEditCompany}
                  >
                    <Text style={styles.companyBtnTextSecondary}>
                      Редактировать профиль компании
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Витрина поставщика */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Витрина поставщика</Text>
              <View style={styles.sectionCard}>
                {modeMarket ? (
                  <>
                    <Text style={styles.companyTitle}>
                      Витрина товаров и материалов
                    </Text>
                    <Text style={styles.companyText}>
                      Управляйте своими объявлениями, открывайте витрину поставщика и связывайте профиль с маркетом и картой.
                    </Text>

                    <Pressable
                      style={styles.companyBtn}
                      onPress={() => router.push("/supplierShowcase")}
                    >
                      <Text style={styles.companyBtnText}>
                        Открыть витрину поставщика
                      </Text>
                    </Pressable>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <Pressable
                        style={[styles.companyBtn, styles.companyBtnSecondary]}
                        onPress={() => router.push("/(tabs)/market" as any)}
                      >
                        <Text style={styles.companyBtnTextSecondary}>
                          Открыть маркет
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.companyBtn, styles.companyBtnSecondary]}
                        onPress={() => router.push("/auctions" as any)}
                      >
                        <Text style={styles.companyBtnTextSecondary}>
                          Открыть торги
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      style={[
                        styles.companyBtn,
                        styles.companyBtnSecondary,
                        { marginTop: 10 },
                      ]}
                      onPress={openProfileAssistant}
                    >
                      <Text style={styles.companyBtnTextSecondary}>
                        Спросить AI по витрине и объявлениям
                      </Text>
                    </Pressable>

                    <Text style={[styles.chipHint, { marginTop: 8 }]}>
                      {listingsSummary}. Используйте маркет и карту, чтобы управлять спросом и видимостью объявлений.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.companyTitle}>
                      Витрина недоступна
                    </Text>
                    <Text style={styles.companyText}>
                      Чтобы использовать витрину поставщика, включите режим
                      «Публикую объявления / услуги» в разделе «Как вы
                      используете GOX?» выше.
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.profileSectionHeader}>
                <Ionicons name="settings-outline" size={18} color={UI.accent} />
                <Text style={styles.profileSectionHeaderText}>
                  Аккаунт и сессия
                </Text>
              </View>
              <View style={styles.sectionCard}>
                <MenuActionRow
                  icon="person-outline"
                  title="Редактировать профиль"
                  subtitle="Откройте текущую форму редактирования личного профиля."
                  onPress={openEditProfile}
                />
                <MenuActionRow
                  icon="log-out-outline"
                  title="Выйти из аккаунта"
                  subtitle="Завершить текущую сессию и вернуться на экран входа."
                  onPress={handleSignOut}
                  danger
                  last
                />
              </View>
            </View>
          </>
        )}

        <Text style={styles.profileFooterText}>GOX v1.0.0</Text>
      </ScrollView>

      {/* Модалка создания объявления */}
      <Modal
        visible={listingModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setListingModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <Text style={styles.modalTitle}>Новое объявление</Text>
            <Text style={styles.modalSub}>
              Сначала задайте заголовок и тип объявления, затем укажите город,
              цену и контакты — после публикации оно сразу появится в витрине и
              на карте.
            </Text>

            <ScrollView
              style={{ maxHeight: 430 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <Text style={styles.modalLabel}>Тип объявления</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                {[
                  { code: "material", label: "Материалы" },
                  { code: "service", label: "Услуги" },
                  { code: "rent", label: "Аренда" },
                ].map((k) => {
                  const active = listingKind === k.code;
                  return (
                    <Pressable
                      key={k.code}
                      onPress={() => {
                        // если уже есть позиции и меняем тип — просто предупреждаем, но НЕ чистим корзину
                        if (
                          listingCartItems.length > 0 &&
                          listingKind &&
                          listingKind !== k.code
                        ) {
                          Alert.alert(
                            "Тип подсказок",
                            "В этом объявлении уже есть позиции. Тип наверху влияет только на подсказки из каталога — материалы, услуги и аренду можно смешивать в одном объявлении."
                          );
                        }

                        // всегда выставляем выбранный тип — он нужен для фильтрации каталога
                        setListingKind(
                          k.code as "material" | "service" | "rent"
                        );
                      }}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {k.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Позиция (материал / услуга / аренда) */}
              <LabeledInput
                label="Позиция (материал / услуга / аренда)"
                value={listingTitle}
                onChangeText={(text) => {
                  setListingTitle(text);
                  setListingRikCode(null); // сбрасываем привязку к RIK, если человек меняет руками
                  setListingUom(""); // чистим ед. изм. пока выбирает
                  setCatalogSearch(text);
                  searchCatalogInline(text); // запускаем поиск
                }}
                placeholder="Например: Газоблок D500, кровля, бетон, бетононасос…"
              />

              <Text
                style={{
                  fontSize: 11,
                  color: UI.sub,
                  marginTop: 2,
                  marginBottom: 4,
                }}
              >
                Сначала выберите тип объявления выше (Материалы, Услуги или
                Аренда), затем начните вводить позицию — ниже появятся варианты
                из каталога.
              </Text>

              {/* Встроенные подсказки каталога */}
              {catalogLoading && listingTitle.trim().length >= 2 && (
                <Text
                  style={{
                    fontSize: 11,
                    color: UI.sub,
                    marginBottom: 4,
                  }}
                >
                  Ищем в каталоге…
                </Text>
              )}

              {catalogResults.map((item) => {
                const base: ListingCartItem = {
                  id: `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,
                  rik_code: item.rik_code,
                  name: item.name_human_ru || "Позиция каталога",
                  uom: item.uom_code || "",
                  qty: "",
                  price: "",
                  city: listingCity || profile.city || company?.city || null,
                  kind: listingKind ?? null, // ← фиксируем тип позиции
                };
                return (
                  <Pressable
                    key={item.rik_code}
                    style={styles.catalogItemRow}
                    onPress={() => {
                      if (!listingKind) {
                        Alert.alert(
                          "Тип объявления",
                          "Сначала выберите тип объявления: Материалы, Услуги или Аренда."
                        );
                        return;
                      }

                      // Заполняем шапку объявления
                      setListingRikCode(base.rik_code);
                      setListingTitle(base.name);
                      setListingUom(base.uom || "");

                      // Открываем модалку позиции
                      setEditingItem(base);
                      setItemModalOpen(true);

                      setCatalogResults([]);
                    }}
                  >
                    <Text style={styles.catalogItemTitle}>
                      {item.name_human_ru || "Позиция каталога"}
                    </Text>
                    <Text style={styles.catalogItemMeta}>
                      Ед. изм.: {item.uom_code || "—"} · Тип: {item.kind}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Список позиций в объявлении (корзина) */}
              {listingCartItems.length > 0 && (
                <View
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: UI.border,
                    backgroundColor: UI.cardSoft,
                    padding: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: UI.sub,
                      marginBottom: 4,
                    }}
                  >
                    Позиции в объявлении:
                  </Text>

                  {listingCartItems.map((item) => {
                    const kindLabel =
                      item.kind === "material"
                        ? "Материал"
                        : item.kind === "service"
                          ? "Услуга"
                          : item.kind === "rent"
                            ? "Аренда"
                            : "";

                    return (
                      <View
                        key={item.id}
                        style={{
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: UI.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: UI.text,
                            fontWeight: "600",
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: UI.sub,
                          }}
                        >
                          {kindLabel ? kindLabel + " · " : ""}
                          Кол-во: {item.qty} {item.uom || ""} · Цена:{" "}
                          {item.price} KGS
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <LabeledInput
                label="Описание"
                value={listingDescription}
                onChangeText={setListingDescription}
                placeholder="Кратко опишите материал или услугу, условия доставки и оплаты"
                multiline
                big
              />

              <Text style={styles.modalLabel}>Контакты для связи</Text>

              <LabeledInput
                label="Телефон"
                value={listingPhone}
                onChangeText={setListingPhone}
                placeholder="+996…"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label="WhatsApp"
                value={listingWhatsapp}
                onChangeText={setListingWhatsapp}
                placeholder="+996…"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label="Email"
                value={listingEmail}
                onChangeText={setListingEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setListingModalOpen(false)}
                disabled={savingListing}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={publishListing}
                disabled={savingListing}
              >
                {savingListing ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>
                    Опубликовать
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка выбора позиции из каталога RIK */}
      <Modal
        visible={catalogModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCatalogModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <Text style={styles.modalTitle}>Выбор из каталога</Text>
            <Text style={styles.modalSub}>
              Найдите материал или работу в каталоге и привяжите к объявлению.
            </Text>

            <ScrollView
              style={{ maxHeight: 430 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <LabeledInput
                label="Поиск по названию"
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder="Газоблок, стяжка, кровля…"
              />

              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { alignSelf: "flex-start", marginTop: 6 },
                ]}
                onPress={loadCatalog}
                disabled={catalogLoading}
              >
                {catalogLoading ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Найти</Text>
                )}
              </Pressable>

              {catalogResults.length === 0 && !catalogLoading && (
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: UI.sub,
                  }}
                >
                  Введите запрос и нажмите «Найти», чтобы увидеть позиции
                  каталога.
                </Text>
              )}

              {catalogResults.map((item) => {
                const base: ListingCartItem = {
                  id: `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,
                  rik_code: item.rik_code,
                  name: item.name_human_ru || "Позиция каталога",
                  uom: item.uom_code || "",
                  qty: "",
                  price: "",
                  city: listingCity || profile.city || company?.city || null,
                  kind: listingKind ?? null,
                };

                return (
                  <Pressable
                    key={item.rik_code}
                    style={styles.catalogItemRow}
                    onPress={() => {
                      if (!listingKind) {
                        Alert.alert(
                          "Тип объявления",
                          "Сначала выберите тип объявления: Материалы, Услуги или Аренда."
                        );
                        return;
                      }

                      setListingRikCode(base.rik_code);
                      setListingTitle(base.name);
                      setListingUom(base.uom || "");

                      setEditingItem(base);
                      setItemModalOpen(true);

                      setCatalogModalOpen(false);
                      setCatalogResults([]);
                    }}
                  >
                    <Text style={styles.catalogItemTitle}>
                      {item.name_human_ru || "Позиция каталога"}
                    </Text>
                    <Text style={styles.catalogItemMeta}>
                      Ед. изм.: {item.uom_code || "—"} · Тип: {item.kind}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setCatalogModalOpen(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка добавления позиции в корзину объявления */}
      <Modal
        visible={itemModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setItemModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <Text style={styles.modalTitle}>Добавить позицию</Text>
            <Text style={styles.modalSub}>
              Укажите количество и цену для выбранной позиции — она попадёт в
              список товаров объявления.
            </Text>
            {editingItem && (
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                <LabeledInput
                  label="Город"
                  value={editingItem.city || ""}
                  onChangeText={(v) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, city: v } : prev
                    )
                  }
                  placeholder="Бишкек"
                />

                <LabeledInput
                  label="Ед. изм."
                  value={editingItem.uom || ""}
                  onChangeText={(v) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, uom: v } : prev
                    )
                  }
                  placeholder="мешок, м², м³…"
                />

                <LabeledInput
                  label="Количество"
                  value={editingItem.qty}
                  onChangeText={(v) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, qty: v } : prev
                    )
                  }
                  placeholder="Например: 10"
                  keyboardType="numeric"
                />

                <LabeledInput
                  label="Цена за единицу"
                  value={editingItem.price}
                  onChangeText={(v) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, price: v } : prev
                    )
                  }
                  placeholder="Например: 420"
                  keyboardType="numeric"
                />
              </ScrollView>
            )}

            <View style={styles.modalButtonsRow}>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setItemModalOpen(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  if (!editingItem) return;
                  if (!editingItem.qty.trim() || !editingItem.price.trim()) {
                    Alert.alert(
                      "Позиция",
                      "Укажите и количество, и цену за единицу."
                    );
                    return;
                  }

                  // Если у объявления ещё нет города — берем из первой позиции
                  if (!listingCity && editingItem.city) {
                    setListingCity(editingItem.city);
                  }

                  setListingCartItems((prev) => [...prev, editingItem]);
                  setItemModalOpen(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Добавить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== WIZARD РЕГИСТРАЦИИ КОМПАНИИ ===== */}
      <Modal
        visible={businessOnboardingOpen}
        transparent
        animationType="fade"
        onRequestClose={closeBusinessWizard}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            {/* Заголовок + шаг */}
            <Text style={styles.modalTitle}>Регистрация компании</Text>
            <Text style={styles.modalSub}>
              Шаг {businessStep} из 3 · создаём кабинет компании для работы в
              GOX.
            </Text>

            {/* Прогресс-бар */}
            <View style={styles.wizardProgressOuter}>
              <View
                style={[
                  styles.wizardProgressInner,
                  {
                    width:
                      businessStep === 1
                        ? "33%"
                        : businessStep === 2
                          ? "66%"
                          : "100%",
                  },
                ]}
              />
            </View>

            {/* Контент шагов */}
            <ScrollView
              style={{ maxHeight: 420, marginTop: 10 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {businessStep === 1 && (
                <>
                  <Text style={styles.wizardStepTitle}>Основное</Text>
                  <Text style={styles.wizardStepHint}>
                    Как вас будут видеть клиенты и партнёры в GOX.
                  </Text>

                  <LabeledInput
                    label="Название компании"
                    value={companyNameInput}
                    onChangeText={setCompanyNameInput}
                    placeholder="Название компании"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <LabeledInput
                        label="Орг. форма"
                        value={companyLegalFormInput}
                        onChangeText={setCompanyLegalFormInput}
                        placeholder="ОсОО, ИП…"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <LabeledInput
                        label="Город"
                        value={companyCityInput}
                        onChangeText={setCompanyCityInput}
                        placeholder="Бишкек"
                      />
                    </View>
                  </View>
                  <LabeledInput
                    label="Адрес"
                    value={companyAddressInput}
                    onChangeText={setCompanyAddressInput}
                    placeholder="Улица, дом, офис"
                  />
                  <LabeledInput
                    label="Вид деятельности"
                    value={companyIndustryInput}
                    onChangeText={setCompanyIndustryInput}
                    placeholder="Строительство, ремонт, материалы…"
                  />
                  <LabeledInput
                    label="Короткое описание"
                    value={companyAboutShortInput}
                    onChangeText={setCompanyAboutShortInput}
                    placeholder="1–2 предложения о компании"
                    multiline
                    big
                  />
                </>
              )}

              {businessStep === 2 && (
                <>
                  <Text style={styles.wizardStepTitle}>Контакты</Text>
                  <Text style={styles.wizardStepHint}>
                    Эти данные увидят клиенты и сотрудники для связи.
                  </Text>

                  <LabeledInput
                    label="Основной телефон"
                    value={companyPhoneMainInput}
                    onChangeText={setCompanyPhoneMainInput}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />
                  <LabeledInput
                    label="Телефон WhatsApp"
                    value={companyPhoneWhatsAppInput}
                    onChangeText={setCompanyPhoneWhatsAppInput}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />
                  <LabeledInput
                    label="Email"
                    value={companyEmailInput}
                    onChangeText={setCompanyEmailInput}
                    placeholder="info@company.kg"
                    keyboardType="email-address"
                  />
                  <LabeledInput
                    label="Сайт"
                    value={companySiteInput}
                    onChangeText={setCompanySiteInput}
                    placeholder="https://company.kg"
                  />
                  <LabeledInput
                    label="Telegram"
                    value={companyTelegramInput}
                    onChangeText={setCompanyTelegramInput}
                    placeholder="@company"
                  />
                  <LabeledInput
                    label="График работы"
                    value={companyWorkTimeInput}
                    onChangeText={setCompanyWorkTimeInput}
                    placeholder="Пн–Сб 9:00–18:00"
                  />
                  <LabeledInput
                    label="Контактное лицо"
                    value={companyContactPersonInput}
                    onChangeText={setCompanyContactPersonInput}
                    placeholder="ФИО ответственного"
                  />
                </>
              )}

              {businessStep === 3 && (
                <>
                  <Text style={styles.wizardStepTitle}>Документы</Text>
                  <Text style={styles.wizardStepHint}>
                    Заполните реквизиты, чтобы оформлять договоры и акты. Можно
                    заполнить позже.
                  </Text>

                  <LabeledInput
                    label="ИНН"
                    value={companyInnInput}
                    onChangeText={setCompanyInnInput}
                    placeholder="ИНН компании"
                  />
                  <LabeledInput
                    label="БИН / рег. номер"
                    value={companyBinInput}
                    onChangeText={setCompanyBinInput}
                    placeholder="БИН / регистрационный номер"
                  />
                  <LabeledInput
                    label="Свидетельство / рег. данные"
                    value={companyRegNumberInput}
                    onChangeText={setCompanyRegNumberInput}
                    placeholder="Номер и дата регистрации"
                  />
                  <LabeledInput
                    label="Банковские реквизиты"
                    value={companyBankDetailsInput}
                    onChangeText={setCompanyBankDetailsInput}
                    placeholder="Банк, счёт, БИК"
                    multiline
                    big
                  />
                  <LabeledInput
                    label="Лицензии и допуски"
                    value={companyLicensesInfoInput}
                    onChangeText={setCompanyLicensesInfoInput}
                    placeholder="Гос. лицензии, СРО и т.п."
                    multiline
                    big
                  />
                </>
              )}
            </ScrollView>

            {/* Кнопки wizard */}
            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={
                  businessStep === 1 ? closeBusinessWizard : goPrevBusinessStep
                }
                disabled={savingCompany}
              >
                <Text style={styles.modalBtnSecondaryText}>
                  {businessStep === 1 ? "Отмена" : "Назад"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={
                  businessStep < 3 ? goNextBusinessStep : submitBusinessWizard
                }
                disabled={savingCompany}
              >
                {savingCompany ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>
                    {businessStep < 3 ? "Далее" : "Создать компанию"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка редактирования профиля */}
      <Modal
        visible={editProfileOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEditProfile}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <Text style={styles.modalTitle}>Редактировать профиль</Text>
            <Text style={styles.modalSub}>
              Эти данные используются для личного аккаунта и объявлений.
            </Text>

            <ScrollView
              style={{ maxHeight: 430 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <View style={styles.profileAvatarEditor}>
                <Pressable
                  style={styles.profileAvatarEditorPreview}
                  onPress={pickProfileAvatar}
                >
                  {profileAvatarDraft ? (
                    <Image
                      source={{ uri: profileAvatarDraft }}
                      style={styles.profileAvatarEditorImage}
                    />
                  ) : (
                    <Text style={styles.profileAvatarEditorInitial}>{avatarLetter}</Text>
                  )}
                </Pressable>

                <View style={styles.profileAvatarEditorMeta}>
                  <Text style={styles.profileAvatarEditorTitle}>Фото профиля</Text>
                  <Text style={styles.profileAvatarEditorText}>
                    Аватар показывается в вашем профиле и связанных экранах.
                  </Text>
                  <Pressable
                    style={styles.profileAvatarEditorButton}
                    onPress={pickProfileAvatar}
                    disabled={savingProfile}
                  >
                    <Text style={styles.profileAvatarEditorButtonText}>
                      Выбрать фото
                    </Text>
                  </Pressable>
                </View>
              </View>

              <LabeledInput
                label="Имя / название профиля"
                value={profileNameInput}
                onChangeText={setProfileNameInput}
                placeholder="Ваше имя или название"
              />

              <LabeledInput
                label="Телефон"
                value={profilePhoneInput}
                onChangeText={setProfilePhoneInput}
                placeholder="+996…"
                keyboardType="phone-pad"
              />

              <LabeledInput
                label="Город"
                value={profileCityInput}
                onChangeText={setProfileCityInput}
                placeholder="Бишкек"
              />

              <LabeledInput
                label="О себе"
                value={profileBioInput}
                onChangeText={setProfileBioInput}
                placeholder="Коротко о вашем опыте и специализации"
                multiline
                big
              />

              <LabeledInput
                label="Должность / роль"
                value={profilePositionInput}
                onChangeText={setProfilePositionInput}
                placeholder="Директор, снабженец, прораб…"
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Telegram"
                    value={profileTelegramInput}
                    onChangeText={setProfileTelegramInput}
                    placeholder="@gox_build"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="WhatsApp"
                    value={profileWhatsappInput}
                    onChangeText={setProfileWhatsappInput}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={closeEditProfile}
                disabled={savingProfile}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={saveProfileModal}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка приглашения сотрудников */}
      <Modal
        visible={inviteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInviteModalOpen(false);
          setLastInviteCode(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            {!lastInviteCode && (
              <>
                <Text style={styles.modalTitle}>Пригласить сотрудников</Text>
                <Text style={styles.modalSub}>
                  Добавьте ключевые роли в вашей компании. Укажите номер
                  телефона сотрудника, который использует WhatsApp / Telegram, и
                  при необходимости email — мы сгенерируем код приглашения.
                </Text>
                {/* Выбор роли */}
                <Text style={styles.modalLabel}>Роль</Text>
                <View style={styles.roleChipRow}>
                  {[
                    { code: "foreman", label: "Прораб" },
                    { code: "buyer", label: "Снабженец" },
                    { code: "accountant", label: "Бухгалтер" },
                    { code: "engineer", label: "Инженер / мастер" },
                    { code: "warehouse", label: "Склад" },
                    { code: "contractor", label: "Подрядчик" },
                    { code: "supplier", label: "Поставщик" },
                  ].map((r) => (
                    <Pressable
                      key={r.code}
                      onPress={() => setInviteRole(r.code)}
                      style={[
                        styles.roleChip,
                        inviteRole === r.code && styles.roleChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          inviteRole === r.code &&
                          styles.roleChipTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Форма */}
                <ScrollView
                  style={{ maxHeight: 260, marginTop: 4 }}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  <LabeledInput
                    label="Имя сотрудника"
                    value={inviteName}
                    onChangeText={setInviteName}
                    placeholder="Например: Азиз"
                  />

                  <LabeledInput
                    label="Телефон сотрудника (WhatsApp / Telegram)"
                    value={invitePhone}
                    onChangeText={setInvitePhone}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />

                  <LabeledInput
                    label="Email сотрудника"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="worker@example.com"
                    keyboardType="email-address"
                  />

                  <LabeledInput
                    label="Комментарий"
                    value={inviteComment}
                    onChangeText={setInviteComment}
                    placeholder="Например: ведёт объект в Оше"
                    multiline
                    big
                  />
                </ScrollView>

                <View style={styles.modalButtonsRow}>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => {
                      setInviteModalOpen(false);
                      setLastInviteCode(null);
                    }}
                    disabled={savingInvite}
                  >
                    <Text style={styles.modalBtnSecondaryText}>Позже</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={async () => {
                      try {
                        if (!company) {
                          Alert.alert(
                            "Приглашение",
                            "Сначала создайте компанию."
                          );
                          return;
                        }
                        if (!inviteName.trim() || !invitePhone.trim()) {
                          Alert.alert(
                            "Приглашение",
                            "Укажите имя и телефон сотрудника."
                          );
                          return;
                        }

                        setSavingInvite(true);

                        const inviteCode = generateInviteCode();
                        const phoneTrimmed = invitePhone.trim();
                        const emailTrimmed = inviteEmail.trim() || null;

                        const { error } = await supabase
                          .from("company_invites")
                          .insert({
                            company_id: company.id,
                            role: inviteRole,
                            name: inviteName.trim(),
                            phone: phoneTrimmed,
                            email: emailTrimmed,
                            comment: inviteComment.trim() || null,
                            invite_code: inviteCode,
                          });
                        if (error) {
                          throw error;
                        }

                        // очищаем форму и показываем экран с кодом
                        setInviteName("");
                        setInvitePhone("");
                        setInviteEmail("");
                        setInviteComment("");
                        setLastInviteCode(inviteCode);
                        setLastInvitePhone(phoneTrimmed);
                      } catch (e: any) {
                        Alert.alert(
                          "Приглашение",
                          e?.message ?? String(e)
                        );
                      } finally {
                        setSavingInvite(false);
                      }
                    }}
                    disabled={savingInvite}
                  >
                    {savingInvite ? (
                      <ActivityIndicator color="#0B1120" />
                    ) : (
                      <Text style={styles.modalBtnPrimaryText}>
                        Отправить приглашение
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {lastInviteCode && (
              <>
                <Text style={styles.modalTitle}>Приглашение создано</Text>
                <Text style={styles.modalSub}>
                  Отправьте этот код сотруднику в WhatsApp / Telegram. Он
                  введёт его в приложении и попадёт в ваш кабинет компании.
                </Text>

                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCodeLabel}>Код приглашения</Text>
                  <Text style={styles.inviteCodeValue}>
                    {lastInviteCode}
                  </Text>
                  <Text style={styles.inviteCodeHint}>
                    Действителен 14 дней
                  </Text>
                </View>

                <View style={styles.modalButtonsRow}>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => {
                      // ещё одного пригласить
                      setLastInviteCode(null);
                    }}
                  >
                    <Text style={styles.modalBtnSecondaryText}>
                      Пригласить ещё
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={() => {
                      setInviteModalOpen(false);
                      setLastInviteCode(null);
                    }}
                  >
                    <Text style={styles.modalBtnPrimaryText}>
                      Готово
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.shareRow}>
                  <Pressable
                    style={[styles.shareBtn, styles.shareBtnSecondary]}
                    onPress={async () => {
                      if (!lastInviteCode) return;
                      await Clipboard.setStringAsync(lastInviteCode);
                      Alert.alert(
                        "Код скопирован",
                        "Код приглашения скопирован в буфер обмена."
                      );
                    }}
                  >
                    <Text style={styles.shareBtnSecondaryText}>
                      Скопировать код
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.shareBtn, styles.shareBtnPrimary]}
                    onPress={async () => {
                      if (!lastInviteCode || !lastInvitePhone) {
                        Alert.alert(
                          "Отправка",
                          "Нет номера телефона или кода приглашения."
                        );
                        return;
                      }
                      const msg = `Вас пригласили в компанию ${company?.name || "в GOX BUILD"
                        }. Код приглашения: ${lastInviteCode}. Установите GOX BUILD и введите этот код.`;
                      const url = `whatsapp://send?phone=${encodeURIComponent(
                        lastInvitePhone
                      )}&text=${encodeURIComponent(msg)}`;
                      try {
                        const supported = await Linking.canOpenURL(url);
                        if (!supported) {
                          Alert.alert(
                            "WhatsApp",
                            "WhatsApp не установлен на этом устройстве."
                          );
                          return;
                        }
                        await Linking.openURL(url);
                      } catch (e: any) {
                        Alert.alert(
                          "WhatsApp",
                          e?.message ?? "Не удалось открыть WhatsApp."
                        );
                      }
                    }}
                  >
                    <Text style={styles.shareBtnPrimaryText}>
                      Отправить в WhatsApp
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.shareRow}>
                  <Pressable
                    style={[styles.shareBtn, styles.shareBtnPrimary]}
                    onPress={async () => {
                      if (!lastInviteCode || !lastInvitePhone) {
                        Alert.alert(
                          "Отправка",
                          "Нет номера телефона или кода приглашения."
                        );
                        return;
                      }
                      const msg = `Вас пригласили в компанию ${company?.name || "в GOX BUILD"
                        }. Код приглашения: ${lastInviteCode}. Установите GOX BUILD и введите этот код.`;
                      const url = `tg://msg?text=${encodeURIComponent(
                        msg
                      )}`;
                      try {
                        const supported = await Linking.canOpenURL(url);
                        if (!supported) {
                          Alert.alert(
                            "Telegram",
                            "Telegram не установлен на этом устройстве."
                          );
                          return;
                        }
                        await Linking.openURL(url);
                      } catch (e: any) {
                        Alert.alert(
                          "Telegram",
                          e?.message ?? "Не удалось открыть Telegram."
                        );
                      }
                    }}
                  >
                    <Text style={styles.shareBtnPrimaryText}>
                      Отправить в Telegram
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка редактирования компании */}
      <Modal
        visible={editCompanyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCompanyOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <Text style={styles.modalTitle}>Профиль компании</Text>
            <Text style={styles.modalSub}>
              Эти данные видят ваши сотрудники и партнёры в GOX.
            </Text>

            {/* Вкладки */}
            <View style={styles.tabsRow}>
              {(["main", "contacts", "about", "docs"] as CompanyTab[]).map(
                (tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut
                      );
                      setCompanyTab(tab);
                    }}
                    style={[
                      styles.tabChip,
                      companyTab === tab && styles.tabChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabChipText,
                        companyTab === tab && styles.tabChipTextActive,
                      ]}
                    >
                      {tab === "main" && "Основное"}
                      {tab === "contacts" && "Контакты"}
                      {tab === "about" && "Описание"}
                      {tab === "docs" && "Документы"}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {companyTab === "main" && (
                <>
                  <LabeledInput
                    label="Название компании"
                    value={companyNameInput}
                    onChangeText={setCompanyNameInput}
                    placeholder="Название компании"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <LabeledInput
                        label="Орг. форма"
                        value={companyLegalFormInput}
                        onChangeText={setCompanyLegalFormInput}
                        placeholder="ОсОО, ИП…"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <LabeledInput
                        label="Город"
                        value={companyCityInput}
                        onChangeText={setCompanyCityInput}
                        placeholder="Бишкек"
                      />
                    </View>
                  </View>
                  <LabeledInput
                    label="Адрес"
                    value={companyAddressInput}
                    onChangeText={setCompanyAddressInput}
                    placeholder="Улица, дом, офис"
                  />
                  <LabeledInput
                    label="Вид деятельности"
                    value={companyIndustryInput}
                    onChangeText={setCompanyIndustryInput}
                    placeholder="Строительство, ремонт, материалы…"
                  />
                  <LabeledInput
                    label="Короткое описание"
                    value={companyAboutShortInput}
                    onChangeText={setCompanyAboutShortInput}
                    placeholder="1–2 предложения о компании"
                    multiline
                    big
                  />
                </>
              )}

              {companyTab === "contacts" && (
                <>
                  <LabeledInput
                    label="Основной телефон"
                    value={companyPhoneMainInput}
                    onChangeText={setCompanyPhoneMainInput}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />
                  <LabeledInput
                    label="Телефон WhatsApp"
                    value={companyPhoneWhatsAppInput}
                    onChangeText={setCompanyPhoneWhatsAppInput}
                    placeholder="+996…"
                    keyboardType="phone-pad"
                  />
                  <LabeledInput
                    label="Email"
                    value={companyEmailInput}
                    onChangeText={setCompanyEmailInput}
                    placeholder="info@company.kg"
                    keyboardType="email-address"
                  />
                  <LabeledInput
                    label="Сайт"
                    value={companySiteInput}
                    onChangeText={setCompanySiteInput}
                    placeholder="https://company.kg"
                  />
                  <LabeledInput
                    label="Telegram"
                    value={companyTelegramInput}
                    onChangeText={setCompanyTelegramInput}
                    placeholder="@company"
                  />
                  <LabeledInput
                    label="График работы"
                    value={companyWorkTimeInput}
                    onChangeText={setCompanyWorkTimeInput}
                    placeholder="Пн–Сб 9:00–18:00"
                  />
                  <LabeledInput
                    label="Контактное лицо"
                    value={companyContactPersonInput}
                    onChangeText={setCompanyContactPersonInput}
                    placeholder="ФИО"
                  />
                </>
              )}

              {companyTab === "about" && (
                <>
                  <LabeledInput
                    label="Полное описание"
                    value={companyAboutFullInput}
                    onChangeText={setCompanyAboutFullInput}
                    placeholder="Опишите опыт, проекты, специализацию…"
                    multiline
                    big
                  />
                  <LabeledInput
                    label="Услуги / направления"
                    value={companyServicesInput}
                    onChangeText={setCompanyServicesInput}
                    placeholder="Монолит, кровля, отделка…"
                    multiline
                    big
                  />
                  <LabeledInput
                    label="Регионы работы"
                    value={companyRegionsInput}
                    onChangeText={setCompanyRegionsInput}
                    placeholder="Бишкек, Чуйская область…"
                  />
                  <LabeledInput
                    label="Типы клиентов"
                    value={companyClientsTypesInput}
                    onChangeText={setCompanyClientsTypesInput}
                    placeholder="Частные, B2B, госзаказы…"
                  />
                </>
              )}

              {companyTab === "docs" && (
                <>
                  <LabeledInput
                    label="ИНН"
                    value={companyInnInput}
                    onChangeText={setCompanyInnInput}
                    placeholder="ИНН компании"
                  />
                  <LabeledInput
                    label="БИН / рег. номер"
                    value={companyBinInput}
                    onChangeText={setCompanyBinInput}
                    placeholder="БИН / регистрационный номер"
                  />
                  <LabeledInput
                    label="Свидетельство / рег. данные"
                    value={companyRegNumberInput}
                    onChangeText={setCompanyRegNumberInput}
                    placeholder="Номер и дата регистрации"
                  />
                  <LabeledInput
                    label="Банковские реквизиты"
                    value={companyBankDetailsInput}
                    onChangeText={setCompanyBankDetailsInput}
                    placeholder="Банк, счёт, БИК"
                    multiline
                    big
                  />
                  <LabeledInput
                    label="Лицензии и допуски"
                    value={companyLicensesInfoInput}
                    onChangeText={setCompanyLicensesInfoInput}
                    placeholder="Государственные лицензии, СРО и т.п."
                    multiline
                    big
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setEditCompanyOpen(false)}
                disabled={savingCompany}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={saveCompanyModal}
                disabled={savingCompany}
              >
                {savingCompany ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ =====

function MenuActionRow(props: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.profileMenuRow,
        props.last && styles.profileMenuRowLast,
      ]}
      onPress={props.onPress}
    >
      <View
        style={[
          styles.profileMenuIconWrap,
          props.danger && styles.profileMenuIconWrapDanger,
        ]}
      >
        <Ionicons
          name={props.icon}
          size={18}
          color={props.danger ? "#FCA5A5" : UI.accent}
        />
      </View>
      <View style={styles.profileMenuTextWrap}>
        <Text
          style={[
            styles.profileMenuTitle,
            props.danger && styles.profileMenuTitleDanger,
          ]}
        >
          {props.title}
        </Text>
        <Text style={styles.profileMenuSubtitle}>{props.subtitle}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={props.danger ? "#FCA5A5" : UI.sub}
      />
    </Pressable>
  );
}

function RowItem(props: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.rowItem,
        props.last && { borderBottomWidth: 0, paddingBottom: 0 },
      ]}
    >
      <Text style={styles.rowLabel}>{props.label}</Text>
      <Text style={styles.rowValue}>{props.value}</Text>
    </View>
  );
}

type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  big?: boolean;
  keyboardType?:
  | "default"
  | "email-address"
  | "numeric"
  | "phone-pad"
  | "number-pad";
};

function LabeledInput(props: LabeledInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.modalLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={UI.sub}
        style={[
          styles.modalInput,
          props.big && { height: 80, textAlignVertical: "top" },
          focused && {
            borderColor: UI.accent,
            ...Platform.select({
              web: { boxShadow: `0px 0px 12px rgba(79, 70, 229, 0.35)` },
              default: {
                shadowColor: UI.accent,
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              },
            }),
          },
        ]}
        multiline={props.multiline}
        keyboardType={props.keyboardType || "default"}
        onFocus={() => {
          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut
          );
          setFocused(true);
        }}
        onBlur={() => {
          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut
          );
          setFocused(false);
        }}
      />
    </View>
  );
}

// ===== СТИЛИ =====

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  center: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    marginTop: 8,
    color: UI.sub,
    fontSize: 13,
  },

  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: UI.sub,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  profileHeaderCard: {
    backgroundColor: UI.card,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    marginBottom: 16,
  },
  profileHeaderAvatarWrap: {
    position: "relative",
    marginBottom: 14,
  },
  profileHeaderAvatar: {
    width: 104,
    height: 104,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileHeaderAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileHeaderAvatarText: {
    color: UI.text,
    fontSize: 34,
    fontWeight: "800",
  },
  profileHeaderBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeaderName: {
    color: UI.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  profileHeaderRoleBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  profileHeaderRoleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  profileHeaderSubtitle: {
    marginTop: 10,
    color: UI.sub,
    fontSize: 13,
    textAlign: "center",
  },
  profileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  profileTitleMeta: {
    flex: 1,
  },
  profileTitle: {
    color: UI.text,
    fontSize: 28,
    fontWeight: "800",
  },
  profileTitleSubtitle: {
    marginTop: 4,
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  completionCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  completionTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: "700",
  },
  completionSubtitle: {
    marginTop: 4,
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  completionPercent: {
    color: UI.accent,
    fontSize: 20,
    fontWeight: "800",
  },
  completionBarTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
  },
  completionBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  completionList: {
    marginTop: 12,
    gap: 8,
  },
  completionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completionItemText: {
    color: UI.sub,
    fontSize: 12,
  },
  completionItemTextDone: {
    color: UI.text,
  },
  completionAction: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  completionActionText: {
    color: "#0B1120",
    fontSize: 13,
    fontWeight: "700",
  },
  profileEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },
  profileEditButtonText: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "700",
  },
  profileSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  profileSectionHeaderText: {
    color: UI.text,
    fontSize: 16,
    fontWeight: "700",
  },
  profileActionCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  profileActionTextWrap: {
    flex: 1,
  },
  profileActionTitle: {
    color: UI.text,
    fontSize: 14,
    fontWeight: "700",
  },
  profileActionSubtitle: {
    marginTop: 4,
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  profileHintCard: {
    marginTop: 10,
    backgroundColor: UI.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  profileHintTitle: {
    color: UI.sub,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  profileHintValue: {
    marginTop: 6,
    color: UI.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileHintSubtitle: {
    marginTop: 6,
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  profileMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  profileMenuRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  profileMenuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMenuIconWrapDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "#7F1D1D",
  },
  profileMenuTextWrap: {
    flex: 1,
  },
  profileMenuTitle: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "700",
  },
  profileMenuTitleDanger: {
    color: "#FCA5A5",
  },
  profileMenuSubtitle: {
    marginTop: 3,
    color: UI.sub,
    fontSize: 11,
    lineHeight: 17,
  },

  modeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 10,
    marginBottom: 8,
    backgroundColor: UI.cardSoft,
  },
  modeCardActive: {
    borderColor: UI.accent,
    backgroundColor: UI.accentSoft,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  modeCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.sub,
    alignItems: "center",
    justifyContent: "center",
  },
  modeCheckActive: {
    borderColor: UI.accent,
    backgroundColor: UI.accent,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.text,
  },
  modeText: {
    fontSize: 12,
    color: UI.sub,
  },
  savingHint: {
    marginTop: 4,
    fontSize: 11,
    color: UI.sub,
  },

  companyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
    marginBottom: 4,
  },
  companyText: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 10,
  },
  companyBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  companyBtnSecondary: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
  },
  companyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B1120",
  },
  companyBtnTextSecondary: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.text,
  },
  companySuccessBanner: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: UI.accent,
  },
  companySuccessTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: UI.accent,
    marginBottom: 2,
  },
  companySuccessText: {
    fontSize: 12,
    color: UI.text,
  },

  chipHint: {
    marginTop: 4,
    fontSize: 11,
    color: UI.sub,
  },

  // переключатель Физ / Компания
  modeSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeSwitchBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeSwitchBtnActive: {
    borderColor: UI.accent,
    backgroundColor: UI.accentSoft,
  },
  modeSwitchText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.sub,
  },
  modeSwitchTextActive: {
    color: UI.accent,
  },
  modeSwitchSub: {
    marginTop: 4,
    fontSize: 11,
    color: UI.sub,
  },

  rowItem: {
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 11,
    color: UI.sub,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 13,
    color: UI.text,
  },
  catalogItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  catalogItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.text,
  },
  catalogItemMeta: {
    marginTop: 2,
    fontSize: 11,
    color: UI.sub,
  },

  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: UI.cardSoft,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: UI.accentSoft,
    borderColor: UI.accent,
  },
  filterChipText: {
    fontSize: 12,
    color: UI.sub,
  },
  filterChipTextActive: {
    color: UI.accent,
    fontWeight: "600",
  },
  profileFooterText: {
    marginTop: 4,
    marginBottom: 8,
    color: UI.sub,
    fontSize: 12,
    textAlign: "center",
  },

  inviteCodeBox: {
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.accent,
    alignItems: "center",
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 4,
  },
  inviteCodeValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
    color: UI.accent,
    marginBottom: 4,
  },
  inviteCodeHint: {
    fontSize: 11,
    color: UI.sub,
  },
  roleChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
  },
  roleChipActive: {
    borderColor: UI.accent,
    backgroundColor: UI.accentSoft,
  },
  roleChipText: {
    fontSize: 12,
    color: UI.sub,
  },
  roleChipTextActive: {
    fontSize: 12,
    color: UI.accent,
    fontWeight: "600",
  },

  // ===== ТАБЫ ПРОФИЛЯ КОМПАНИИ =====
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#020617",
  },
  tabChipActive: {
    backgroundColor: UI.accentSoft,
    borderColor: UI.accent,
  },
  tabChipText: {
    fontSize: 12,
    color: "#ffffff",
  },
  tabChipTextActive: {
    color: UI.accent,
    fontWeight: "600",
  },

  shareRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    justifyContent: "center",
  },
  shareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnPrimary: {
    borderColor: UI.accent,
    backgroundColor: UI.accentSoft,
  },
  shareBtnSecondary: {
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
  },
  shareBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.accent,
  },
  shareBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "500",
    color: UI.sub,
  },

  // прогресс wizard
  wizardProgressOuter: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: UI.border,
  },
  wizardProgressInner: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  wizardStepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.text,
    marginTop: 10,
    marginBottom: 4,
  },
  wizardStepHint: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 10,
  },

  // модалки
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: 420,
    maxWidth: "100%",
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    color: UI.sub,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: UI.text,
    backgroundColor: UI.cardSoft,
  },
  profileAvatarEditor: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
  },
  profileAvatarEditorPreview: {
    width: 72,
    height: 72,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },
  profileAvatarEditorImage: {
    width: "100%",
    height: "100%",
  },
  profileAvatarEditorInitial: {
    color: UI.text,
    fontSize: 28,
    fontWeight: "700",
  },
  profileAvatarEditorMeta: {
    flex: 1,
  },
  profileAvatarEditorTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: "700",
  },
  profileAvatarEditorText: {
    color: UI.sub,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  profileAvatarEditorButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: UI.accent,
  },
  profileAvatarEditorButtonText: {
    color: UI.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#22C55E",
    backgroundColor: "#020617",
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondary: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  modalBtnPrimary: {
    backgroundColor: "#22C55E",
  },
  modalBtnSecondaryText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  modalBtnPrimaryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
