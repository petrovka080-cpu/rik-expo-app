// app/(tabs)/profile.tsx
console.log("🔥 USING NEW PROFILE FILE");
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
  Linking,           // ← ДОБАВЬ
} from "react-native";
import * as Clipboard from "expo-clipboard"; // ← НОВЫЙ ИМПОРТ
import * as Location from "expo-location";

import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabaseClient";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const IS_DEMO = __DEV__;

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

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return `GB-${code}`;
}
export default function ProfileScreen() {
  const router = useRouter();

  const [profileMode, setProfileMode] = useState<ProfileMode>(null);

  const [loading, setLoading] = useState(true);
  const [savingUsage, setSavingUsage] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

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
      const payload: Partial<UserProfile> = {
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

      const basePayload = {
        owner_user_id: user.id,
        name: companyNameInput.trim() || "Моя компания GOX",
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
        const companyName =
          profile?.full_name?.trim() || "Моя компания GOX";

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
          timeout: 10000,
        });

        const { latitude, longitude } = loc.coords;
        lat = latitude;
        lng = longitude;
        console.log("listing location:", lat, lng);
      } catch (e: any) {
        console.log("location error", e);
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
    setEditProfileOpen(true);
  };

  const saveProfileModal = async () => {
    if (!profile) return;
    try {
      setSavingProfile(true);
      const payload: Partial<UserProfile> = {
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

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditProfileOpen(false);
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

      const basePayload = {
        owner_user_id: user.id,
        name: companyNameInput.trim() || "Моя компания GOX",
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

  const profileName =
    profile?.full_name?.trim() || profile?.user_id?.slice(0, 8) || "GOX";
  const roleLabel = "Профиль GOX";

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Загружаем профиль…</Text>
      </View>
    );
  }

  console.log("MY LISTINGS:", myListings);
  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* ВЫБОР РЕЖИМА ПРОФИЛЯ */}
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
            {/* HERO профиля */}
            <View style={styles.heroCard}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {profileName[0]?.toUpperCase() || "G"}
                  </Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.name}>{profileName}</Text>
                  <Text style={styles.role}>{roleLabel}</Text>
                  <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                      В сети · отвечает обычно за 2 ч
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable style={styles.heroButton} onPress={openEditProfile}>
                <Text style={styles.heroButtonText}>
                  Редактировать профиль
                </Text>
              </Pressable>
            </View>

            {/* Как используете GOX */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Как вы используете GOX?</Text>
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
                        <Text style={styles.modeCheckIcon}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.modeTitle}>
                      Публикую объявления / услуги
                    </Text>
                  </View>
                  <Text style={styles.modeText}>
                    Продаю материалы, инструмент, технику или предлагаю
                    ремонтные и строительные услуги.
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
                        <Text style={styles.modeCheckIcon}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.modeTitle}>
                      Управляю стройкой / бизнесом
                    </Text>
                  </View>
                  <Text style={styles.modeText}>
                    Веду объекты, заявки, снабжение, подрядчиков и учёт работ в
                    полном объёме как компания или бригада.
                  </Text>
                </Pressable>

                {savingUsage && (
                  <Text style={styles.savingHint}>Сохраняем настройки…</Text>
                )}
              </View>
            </View>

            {/* Чипы статуса аккаунта */}
            <View style={styles.chipRow}>
              {/* === БАЛАНС === */}
              <View style={styles.chipCard}>
                <Text style={styles.chipLabel}>Баланс</Text>

                <Text style={styles.chipValue}>
                  {IS_DEMO ? "47.78 KGS" : "0 KGS"}
                </Text>

                <Text style={styles.chipHint}>
                  {IS_DEMO
                    ? "Пополнить для продвижения заявок"
                    : "Баланс будет доступен после настройки аккаунта"}
                </Text>
              </View>

              {/* === РЕЙТИНГ === */}
              <View style={styles.chipCard}>
                <Text style={styles.chipLabel}>Рейтинг</Text>

                <Text style={styles.chipValue}>
                  {IS_DEMO ? "4.9★" : "—"}
                </Text>

                <Text style={styles.chipHint}>
                  {IS_DEMO
                    ? "Основан на отзывах и сделках"
                    : "Рейтинг появится после первых сделок"}
                </Text>
              </View>

              {/* === ВЕРИФИКАЦИЯ === */}
              <View style={styles.chipCard}>
                <Text style={styles.chipLabel}>Верификация</Text>

                <Text style={styles.chipValue}>
                  {IS_DEMO ? "Проверено" : "Не пройдено"}
                </Text>

                <Text style={styles.chipHint}>
                  {IS_DEMO
                    ? "Документы компании подтверждены"
                    : "Пройдите верификацию, чтобы получить отметку"}
                </Text>
              </View>
            </View>

            {/* Быстрые действия */}
            <View style={styles.quickGrid}>
              <QuickAction
                title="Мои объекты"
                subtitle="Стройки и адреса"
                onPress={() => router.push("/foreman")}
              />
              <QuickAction
                title="Мои заявки"
                subtitle="Запросы на материалы"
                onPress={() => router.push("/director")}
              />
              <QuickAction
                title="Мои предложения"
                subtitle="Ответы на заявки"
                onPress={() => router.push("/buyer")}
              />
              <QuickAction
                title="Мои объявления"
                subtitle="Товары и услуги"
                onPress={openListingModal}
              />
            </View>

            {/* Активность — заглушка */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Активность</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                <FilterChip active>Заявки</FilterChip>
                <FilterChip>Предложения</FilterChip>
                <FilterChip>Объявления</FilterChip>
                <FilterChip>Отзывы</FilterChip>
              </ScrollView>

              <View style={styles.emptyActivity}>
                <Text style={styles.emptyTitle}>
                  Здесь появится ваша активность в GOX
                </Text>
                <Text style={styles.emptyText}>
                  Создавайте заявки, предлагайте материалы или публикуйте
                  объявления — история будет отображаться в этом разделе.
                </Text>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push("/director")}
                >
                  <Text style={styles.actionBtnText}>
                    Создать первую заявку
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {profileMode === "company" && (
          <>
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
                  value={company?.name || "GOX Construction Systems"}
                />
                <RowItem
                  label="Город"
                  value={company?.city || profile.city || "Бишкек"}
                />
                <RowItem
                  label="Вид деятельности"
                  value={company?.industry || "Строительство / материалы"}
                />
                <RowItem
                  label="Телефон"
                  value={company?.phone_main || profile.phone || "+996…"}
                />
                <RowItem label="Сайт" value={company?.site || "gox.build"} last />
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
                      Показ ваших материалов в формате Netflix-витрины и
                      карточек как у Zillow. Покажите прайс по разделам и
                      брендам.
                    </Text>

                    <Pressable
                      style={styles.companyBtn}
                      onPress={() => router.push("/supplierShowcase")}
                    >
                      <Text style={styles.companyBtnText}>
                        Открыть витрину поставщика
                      </Text>
                    </Pressable>

                    <Text style={[styles.chipHint, { marginTop: 8 }]}>
                      Пока показываются примерные данные — позже подключим вашу
                      базу материалов и склад.
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
          </>
        )}
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
                label="Email (необязательно)"
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

            <View className="modalButtonsRow" style={styles.modalButtonsRow}>
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
                    placeholder="GOX Construction Systems"
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
                    placeholder="info@gox.build"
                    keyboardType="email-address"
                  />
                  <LabeledInput
                    label="Сайт"
                    value={companySiteInput}
                    onChangeText={setCompanySiteInput}
                    placeholder="https://gox.build"
                  />
                  <LabeledInput
                    label="Telegram"
                    value={companyTelegramInput}
                    onChangeText={setCompanyTelegramInput}
                    placeholder="@gox_company"
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
        onRequestClose={() => setEditProfileOpen(false)}
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
                onPress={() => setEditProfileOpen(false)}
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
                    label="Email сотрудника (необязательно)"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="worker@example.com"
                    keyboardType="email-address"
                  />

                  <LabeledInput
                    label="Комментарий (необязательно)"
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
                      const msg = `Вас пригласили в компанию ${
                        company?.name || "в GOX BUILD"
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
                      const msg = `Вас пригласили в компанию ${
                        company?.name || "в GOX BUILD"
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
                    placeholder="GOX Construction Systems"
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
                    placeholder="info@gox.build"
                    keyboardType="email-address"
                  />
                  <LabeledInput
                    label="Сайт"
                    value={companySiteInput}
                    onChangeText={setCompanySiteInput}
                    placeholder="https://gox.build"
                  />
                  <LabeledInput
                    label="Telegram"
                    value={companyTelegramInput}
                    onChangeText={setCompanyTelegramInput}
                    placeholder="@gox_company"
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

function QuickAction(props: {
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={props.onPress}>
      <View style={styles.quickIcon}>
        <Text style={styles.quickIconText}>●</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{props.title}</Text>
        <Text style={styles.quickSub}>{props.subtitle}</Text>
      </View>
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

function FilterChip(props: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <View
      style={[
        styles.filterChip,
        props.active && styles.filterChipActive,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          props.active && styles.filterChipTextActive,
        ]}
      >
        {props.children}
      </Text>
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
            shadowColor: UI.accent,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
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

  heroCard: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 16,
  },
  avatarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.text,
  },
  heroText: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.text,
  },
  role: {
    marginTop: 2,
    fontSize: 12,
    color: UI.sub,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  statusText: {
    fontSize: 11,
    color: UI.sub,
  },
  heroButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: UI.accent,
  },
  heroButtonText: {
    color: UI.accent,
    fontSize: 13,
    fontWeight: "600",
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

  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chipCard: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  chipLabel: {
    fontSize: 11,
    color: UI.sub,
  },
  chipValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: UI.text,
  },
  chipHint: {
    marginTop: 4,
    fontSize: 11,
    color: UI.sub,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  quickCard: {
    width: "48%",
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconText: {
    color: UI.sub,
    fontSize: 12,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.text,
  },
  quickSub: {
    fontSize: 11,
    color: UI.sub,
    marginTop: 2,
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

  emptyActivity: {
    marginTop: 12,
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: UI.sub,
  },
  actionBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B1120",
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

