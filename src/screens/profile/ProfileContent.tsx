import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useSegments } from "expo-router";

import {
  AUTH_LOGIN_ROUTE,
  buildAssistantRoute,
  buildSupplierShowcaseRoute,
  DIRECTOR_ROUTE,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
  SUPPLIER_MAP_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { generateInviteCode, getErrorMessage } from "./profile.helpers";
import { profileStyles } from "./profile.styles";
import { ProfileMainSections } from "./components/ProfileMainSections";
import { ProfileModalStack } from "./components/ProfileModalStack";
import { useCompanyForm } from "./hooks/useCompanyForm";
import { useProfileDerivedState } from "./hooks/useProfileDerivedState.ts";
import { useListingForm } from "./hooks/useListingForm";
import { useProfileForm } from "./hooks/useProfileForm";
import {
  buildProfileModeFromCompany,
  createCompanyInvite,
  createMarketListing,
  ensureCompanyCabinetAccess,
  loadCatalogItems,
  loadProfileScreenData,
  saveCompanyProfile,
  saveProfileDetails,
  saveProfileUsage,
  searchCatalogItems,
  signOutProfileSession,
} from "./profile.services";
import type {
  CatalogSearchItem,
  Company,
  CompanyTab,
  ListingCartItem,
  ProfileMode,
  ProfileListingRecord,
  UserProfile,
} from "./profile.types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const styles = profileStyles;

export function ProfileContent() {
  const router = useRouter();
  const segments = useSegments();
  const currentLeafSegment = segments[segments.length - 1] || "";
  const isAddListingRoute = currentLeafSegment === "add";
  const addListingRouteOpenedRef = useRef(false);

  const [profileMode, setProfileMode] = useState<ProfileMode>(null);

  const [loading, setLoading] = useState(true);
  const [savingUsage, setSavingUsage] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [, setSigningOut] = useState(false);

  // ===== Мои объявления =====
  const [myListings, setMyListings] = useState<ProfileListingRecord[]>([]);

  // ===== КОРЗИНА ПОЗИЦИЙ ДЛЯ ОБЪЯВЛЕНИЯ =====
  const [itemModalOpen, setItemModalOpen] = useState(false);

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

  const {
    profileForm,
    profileAvatarDraft,
    setProfileAvatarDraft,
    hydrateProfileForm,
    resetProfileAvatarDraft,
    profileNameInput,
    setProfileNameInput,
    profilePhoneInput,
    setProfilePhoneInput,
    profileCityInput,
    setProfileCityInput,
    profileBioInput,
    setProfileBioInput,
    profileTelegramInput,
    setProfileTelegramInput,
    profileWhatsappInput,
    setProfileWhatsappInput,
    profilePositionInput,
    setProfilePositionInput,
  } = useProfileForm();

  const {
    companyForm,
    hydrateCompanyForm,
    companyNameInput,
    setCompanyNameInput,
    companyCityInput,
    setCompanyCityInput,
    companyLegalFormInput,
    setCompanyLegalFormInput,
    companyAddressInput,
    setCompanyAddressInput,
    companyIndustryInput,
    setCompanyIndustryInput,
    companyAboutShortInput,
    setCompanyAboutShortInput,
    companyPhoneMainInput,
    setCompanyPhoneMainInput,
    companyPhoneWhatsAppInput,
    setCompanyPhoneWhatsAppInput,
    companyEmailInput,
    setCompanyEmailInput,
    companySiteInput,
    setCompanySiteInput,
    companyTelegramInput,
    setCompanyTelegramInput,
    companyWorkTimeInput,
    setCompanyWorkTimeInput,
    companyContactPersonInput,
    setCompanyContactPersonInput,
    companyAboutFullInput,
    setCompanyAboutFullInput,
    companyServicesInput,
    setCompanyServicesInput,
    companyRegionsInput,
    setCompanyRegionsInput,
    companyClientsTypesInput,
    setCompanyClientsTypesInput,
    companyInnInput,
    setCompanyInnInput,
    companyBinInput,
    setCompanyBinInput,
    companyRegNumberInput,
    setCompanyRegNumberInput,
    companyBankDetailsInput,
    setCompanyBankDetailsInput,
    companyLicensesInfoInput,
    setCompanyLicensesInfoInput,
  } = useCompanyForm();

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
  const [savingListing, setSavingListing] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const {
    listingForm,
    listingCartItems,
    setListingCartItems,
    editingItem,
    setEditingItem,
    catalogSearch,
    setCatalogSearch,
    catalogResults,
    setCatalogResults,
    catalogLoading,
    setCatalogLoading,
    prepareListingForm,
    listingTitle,
    setListingTitle,
    listingCity,
    setListingCity,
    listingPrice,
    setListingPrice,
    listingUom,
    setListingUom,
    listingDescription,
    setListingDescription,
    listingPhone,
    setListingPhone,
    listingWhatsapp,
    setListingWhatsapp,
    listingEmail,
    setListingEmail,
    listingKind,
    setListingKind,
    listingRikCode,
    setListingRikCode,
  } = useListingForm();

  // ===== ЗАГРУЗКА ПРОФИЛЯ И КОМПАНИИ =====
  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      try {
        setLoading(true);
        const result = await loadProfileScreenData();
        if (!alive) return;

        setProfile(result.profile);
        setCompany(result.company);
        setProfileRole(result.profileRole);
        setProfileEmail(result.profileEmail);
        setProfileAvatarUrl(result.profileAvatarUrl);
        setProfileAvatarDraft(result.profileAvatarUrl);
        setMyListings(result.myListings);
        setModeMarket(result.profile.usage_market);
        setModeBuild(result.profile.usage_build);
        setProfileMode(buildProfileModeFromCompany(result.company));
      } catch (e: unknown) {
        if (!alive) return;
        console.warn("loadAll error:", getErrorMessage(e));
        Alert.alert("Профиль", getErrorMessage(e));
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
  const updateUsage = useCallback(async (nextMarket: boolean, nextBuild: boolean) => {
    setModeMarket(nextMarket);
    setModeBuild(nextBuild);

    if (!profile) return;

    try {
      setSavingUsage(true);
      const nextProfile = await saveProfileUsage(profile, nextMarket, nextBuild);
      setProfile(nextProfile);
    } catch (e: unknown) {
      console.warn("updateUsage error:", getErrorMessage(e));
      Alert.alert("Профиль", getErrorMessage(e));
    } finally {
      setSavingUsage(false);
    }
  }, [profile]);
  const toggleMarket = () => updateUsage(!modeMarket, modeBuild);

  // НОВАЯ ЛОГИКА: если включаем «веду бизнес» — запускаем wizard
  const handlePressBuildCard = useCallback(() => {
    if (!modeBuild) {
      hydrateCompanyForm({ company, profile });
      setBusinessStep(1);
      setBusinessOnboardingOpen(true);
    } else {
      // уже включён — можно просто выключить
      updateUsage(modeMarket, false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProfileMode("person");
    }
  }, [company, hydrateCompanyForm, modeBuild, modeMarket, profile, updateUsage]);

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
      const nextCompany = await saveCompanyProfile({
        company,
        profile,
        profileEmail,
        form: companyForm,
      });

      setCompany(nextCompany);
      await updateUsage(modeMarket, true);
      setJustCreatedCompany(true);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProfileMode("company");
      setBusinessOnboardingOpen(false);
      setBusinessStep(1);
    } catch (e: unknown) {
      Alert.alert("Компания", getErrorMessage(e));
    } finally {
      setSavingCompany(false);
    }
  };
  const openCompanyCabinet = useCallback(async () => {
    try {
      setSavingUsage(true);
      const nextCompany = await ensureCompanyCabinetAccess({
        company,
        profile,
        profileEmail,
      });

      setCompany(nextCompany);
      setProfileMode("company");
      router.push(DIRECTOR_ROUTE);
    } catch (e: unknown) {
      console.warn("openCompanyCabinet error:", getErrorMessage(e));
      Alert.alert("Кабинет компании", getErrorMessage(e));
    } finally {
      setSavingUsage(false);
    }
  }, [company, profile, profileEmail, router]);
  const openListingModal = useCallback(() => {
    if (!profile) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    prepareListingForm({ profile, company, profileMode });
    setListingModalOpen(true);
  }, [company, prepareListingForm, profile, profileMode]);
  const closeListingModal = useCallback(() => {
    setListingModalOpen(false);
    if (isAddListingRoute) {
      router.replace(MARKET_TAB_ROUTE);
    }
  }, [isAddListingRoute, router]);
  const closeCatalogModal = () => {
    setCatalogModalOpen(false);
  };
  const closeItemModal = () => {
    setItemModalOpen(false);
    setEditingItem(null);
  };
  const buildListingCatalogItem = (
    item: CatalogSearchItem,
  ): ListingCartItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    rik_code: item.rik_code,
    name: item.name_human_ru || "Позиция каталога",
    uom: item.uom_code || "",
    qty: "",
    price: "",
    city: listingCity || profile?.city || company?.city || null,
    kind: listingKind ?? null,
  });
  const handleListingKindChange = (
    nextKind: "material" | "service" | "rent",
  ) => {
    if (
      listingCartItems.length > 0 &&
      listingKind &&
      listingKind !== nextKind
    ) {
      Alert.alert(
        "Тип подсказок",
        "В этом объявлении уже есть позиции. Тип наверху влияет только на подсказки из каталога — материалы, услуги и аренду можно смешивать в одном объявлении.",
      );
    }

    setListingKind(nextKind);
  };
  const handleListingTitleChange = (text: string) => {
    setListingTitle(text);
    setListingRikCode(null);
    setListingUom("");
    setCatalogSearch(text);
    void searchCatalogInline(text);
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

      if (!listingPhone.trim() && !listingWhatsapp.trim() && !listingEmail.trim()) {
        Alert.alert(
          "Объявление",
          "Укажите хотя бы один контакт: телефон, WhatsApp или email."
        );
        return;
      }

      let lat: number | null = null;
      let lng: number | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Геолокация",
          "Разрешите доступ к местоположению, чтобы разместить объявление на карте."
        );
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch {
        Alert.alert(
          "Геолокация",
          "Не удалось автоматически определить местоположение. Попробуйте ещё раз."
        );
        return;
      }

      if (lat == null || lng == null) {
        Alert.alert(
          "Геолокация",
          "Не удалось получить координаты. Объявление не будет размещено."
        );
        return;
      }

      await createMarketListing({
        userId: profile?.user_id ?? "",
        companyId: profileMode === "company" && company ? company.id : null,
        form: {
          listingTitle,
          listingCity,
          listingPrice,
          listingUom,
          listingDescription,
          listingPhone,
          listingWhatsapp,
          listingEmail,
          listingKind,
          listingRikCode,
        },
        listingCartItems,
        lat,
        lng,
      });

      setListingModalOpen(false);
      if (isAddListingRoute) {
        router.replace(MARKET_TAB_ROUTE);
      }

      Alert.alert(
        "Объявление опубликовано",
        "Ваше объявление уже видно в витрине и на карте.",
        [
          {
            text: "Открыть витрину",
            onPress: () => router.push(buildSupplierShowcaseRoute()),
          },
          { text: "Ок", style: "cancel" },
        ]
      );
    } catch (e: unknown) {
      Alert.alert("Объявление", getErrorMessage(e));
    } finally {
      setSavingListing(false);
    }
  };
  useEffect(() => {
    if (!isAddListingRoute) {
      addListingRouteOpenedRef.current = false;
      return;
    }
    if (!profile) return;
    if (listingModalOpen) return;
    if (addListingRouteOpenedRef.current) return;
    addListingRouteOpenedRef.current = true;
    openListingModal();
  }, [isAddListingRoute, listingModalOpen, openListingModal, profile]);

  const searchCatalogInline = async (term: string) => {
    const q = term.trim();

    if (q.length < 2) {
      setCatalogResults([]);
      return;
    }

    try {
      setCatalogLoading(true);
      const results = await searchCatalogItems(q, listingKind);
      setCatalogResults(results);
    } catch (e: unknown) {
      console.warn("searchCatalogInline error:", getErrorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  };
  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const results = await loadCatalogItems(catalogSearch, listingKind);
      setCatalogResults(results);
    } catch (e: unknown) {
      Alert.alert("Каталог", getErrorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  };
  const handleInlineCatalogPick = (item: CatalogSearchItem) => {
    if (!listingKind) {
      Alert.alert(
        "Тип объявления",
        "Сначала выберите тип объявления: Материалы, Услуги или Аренда.",
      );
      return;
    }

    const base = buildListingCatalogItem(item);
    setListingRikCode(base.rik_code);
    setListingTitle(base.name);
    setListingUom(base.uom || "");
    setEditingItem(base);
    setItemModalOpen(true);
    setCatalogResults([]);
  };
  const handleCatalogModalPick = (item: CatalogSearchItem) => {
    if (!listingKind) {
      Alert.alert(
        "Тип объявления",
        "Сначала выберите тип объявления: Материалы, Услуги или Аренда.",
      );
      return;
    }

    const base = buildListingCatalogItem(item);
    setListingRikCode(base.rik_code);
    setListingTitle(base.name);
    setListingUom(base.uom || "");
    setEditingItem(base);
    setItemModalOpen(true);
    setCatalogModalOpen(false);
    setCatalogResults([]);
  };
  const handleEditingItemCityChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, city: value } : prev));
  };
  const handleEditingItemUomChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, uom: value } : prev));
  };
  const handleEditingItemQtyChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, qty: value } : prev));
  };
  const handleEditingItemPriceChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, price: value } : prev));
  };
  const handleEditingItemConfirm = () => {
    if (!editingItem) return;
    if (!editingItem.qty.trim() || !editingItem.price.trim()) {
      Alert.alert(
        "Позиция",
        "Укажите и количество, и цену за единицу.",
      );
      return;
    }

    if (!listingCity && editingItem.city) {
      setListingCity(editingItem.city);
    }

    setListingCartItems((prev) => [...prev, editingItem]);
    setItemModalOpen(false);
    setEditingItem(null);
  };
  const openEditProfile = useCallback(() => {
    if (!profile) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hydrateProfileForm(profile, profileAvatarUrl);
    setEditProfileOpen(true);
  }, [hydrateProfileForm, profile, profileAvatarUrl]);

  const closeEditProfile = () => {
    resetProfileAvatarDraft(profileAvatarUrl);
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
            await signOutProfileSession();
            router.replace(AUTH_LOGIN_ROUTE);
          } catch (e: unknown) {
            Alert.alert("Профиль", getErrorMessage(e));
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
      const result = await saveProfileDetails({
        profile,
        profileAvatarUrl,
        profileAvatarDraft,
        modeMarket,
        modeBuild,
        form: profileForm,
      });

      setProfile(result.profile);
      setProfileAvatarUrl(result.profileAvatarUrl);
      setProfileAvatarDraft(result.profileAvatarUrl);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      closeEditProfile();
    } catch (e: unknown) {
      Alert.alert("Профиль", getErrorMessage(e));
    } finally {
      setSavingProfile(false);
    }
  };
  const openEditCompany = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hydrateCompanyForm({ company, profile });
    setCompanyTab("main");
    setEditCompanyOpen(true);
  };
  const closeEditCompany = () => {
    setEditCompanyOpen(false);
  };
  const handleCompanyTabSelect = (tab: CompanyTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCompanyTab(tab);
  };

  const saveCompanyModal = async () => {
    try {
      setSavingCompany(true);
      const nextCompany = await saveCompanyProfile({
        company,
        profile,
        profileEmail,
        form: companyForm,
      });

      setCompany(nextCompany);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditCompanyOpen(false);
    } catch (e: unknown) {
      Alert.alert("Компания", getErrorMessage(e));
    } finally {
      setSavingCompany(false);
    }
  };
  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setLastInviteCode(null);
  };
  const handleInviteSubmit = async () => {
    try {
      if (!company) {
        Alert.alert(
          "Приглашение",
          "Сначала создайте компанию.",
        );
        return;
      }
      if (!inviteName.trim() || !invitePhone.trim()) {
        Alert.alert(
          "Приглашение",
          "Укажите имя и телефон сотрудника.",
        );
        return;
      }

      setSavingInvite(true);

      const inviteCode = generateInviteCode();
      const phoneTrimmed = invitePhone.trim();

      await createCompanyInvite({
        companyId: company.id,
        inviteCode,
        form: {
          inviteRole,
          inviteName,
          invitePhone,
          inviteComment,
          inviteEmail,
        },
      });

      setInviteName("");
      setInvitePhone("");
      setInviteEmail("");
      setInviteComment("");
      setLastInviteCode(inviteCode);
      setLastInvitePhone(phoneTrimmed);
    } catch (e: unknown) {
      Alert.alert(
        "Приглашение",
        getErrorMessage(e),
      );
    } finally {
      setSavingInvite(false);
    }
  };
  const handleInviteAnother = () => {
    setLastInviteCode(null);
  };
  const buildInviteShareMessage = () =>
    `Вас пригласили в компанию ${company?.name || "в GOX BUILD"}. Код приглашения: ${lastInviteCode}. Установите GOX BUILD и введите этот код.`;
  const handleCopyInviteCode = async () => {
    if (!lastInviteCode) return;
    await Clipboard.setStringAsync(lastInviteCode);
    Alert.alert(
      "Код скопирован",
      "Код приглашения скопирован в буфер обмена.",
    );
  };
  const handleShareInviteWhatsApp = async () => {
    if (!lastInviteCode || !lastInvitePhone) {
      Alert.alert(
        "Отправка",
        "Нет номера телефона или кода приглашения.",
      );
      return;
    }

    const url = `whatsapp://send?phone=${encodeURIComponent(
      lastInvitePhone,
    )}&text=${encodeURIComponent(buildInviteShareMessage())}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "WhatsApp",
          "WhatsApp не установлен на этом устройстве.",
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        "WhatsApp",
        e?.message ?? "Не удалось открыть WhatsApp.",
      );
    }
  };
  const handleShareInviteTelegram = async () => {
    if (!lastInviteCode || !lastInvitePhone) {
      Alert.alert(
        "Отправка",
        "Нет номера телефона или кода приглашения.",
      );
      return;
    }

    const url = `tg://msg?text=${encodeURIComponent(
      buildInviteShareMessage(),
    )}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "Telegram",
          "Telegram не установлен на этом устройстве.",
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        "Telegram",
        e?.message ?? "Не удалось открыть Telegram.",
      );
    }
  };
  const {
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
    companyCompletionPercent,
    assistantPrompt,
  } = useProfileDerivedState({
    profile,
    company,
    profileRole,
    profileEmail,
    modeMarket,
    modeBuild,
    myListings,
  });
  const selectPersonMode = useCallback(() => {
    setProfileMode("person");
  }, []);
  const selectCompanyMode = useCallback(() => {
    setProfileMode("company");
  }, []);
  const openMarket = useCallback(() => {
    router.push(MARKET_TAB_ROUTE);
  }, [router]);
  const openSupplierMap = useCallback(() => {
    router.push(SUPPLIER_MAP_ROUTE);
  }, [router]);
  const openMarketAuctions = useCallback(() => {
    router.push(MARKET_AUCTIONS_ROUTE);
  }, [router]);
  const openSupplierShowcase = useCallback(() => {
    router.push(buildSupplierShowcaseRoute());
  }, [router]);
  const openProfileAssistant = useCallback(() => {
    router.push(
      buildAssistantRoute({
        prompt: assistantPrompt,
        autoSend: "1",
        context: "profile",
      }),
    );
  }, [assistantPrompt, router]);
  const openPersonCompanyCard = company ? openCompanyCabinet : handlePressBuildCard;
  const openCompanyCabinetFromBanner = useCallback(() => {
    setJustCreatedCompany(false);
    void openCompanyCabinet();
  }, [openCompanyCabinet]);
  const openInviteModal = useCallback(() => {
    setInviteModalOpen(true);
  }, []);
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
      <ProfileMainSections
        profileMode={profileMode}
        profileAvatarUrl={profileAvatarUrl}
        avatarLetter={avatarLetter}
        profileName={profileName}
        roleLabel={roleLabel}
        roleColor={roleColor}
        accountSubtitle={accountSubtitle}
        profile={profile}
        company={company}
        profileEmail={profileEmail}
        lastInviteCode={lastInviteCode}
        requisitesVisible={requisitesVisible}
        listingsSummary={listingsSummary}
        companyCardTitle={companyCardTitle}
        companyCardSubtitle={companyCardSubtitle}
        profileCompletionItems={profileCompletionItems}
        profileCompletionDone={profileCompletionDone}
        profileCompletionPercent={profileCompletionPercent}
        companyCompletionItems={companyCompletionItems}
        companyCompletionPercent={companyCompletionPercent}
        justCreatedCompany={justCreatedCompany}
        modeMarket={modeMarket}
        modeBuild={modeBuild}
        savingUsage={savingUsage}
        onOpenEditProfile={openEditProfile}
        onSelectPersonMode={selectPersonMode}
        onSelectCompanyMode={selectCompanyMode}
        onOpenPersonCompanyCard={openPersonCompanyCard}
        onOpenMarket={openMarket}
        onOpenListingModal={openListingModal}
        onOpenSupplierMap={openSupplierMap}
        onOpenMarketAuctions={openMarketAuctions}
        onOpenProfileAssistant={openProfileAssistant}
        onPressBuildCard={handlePressBuildCard}
        onOpenEditCompany={openEditCompany}
        onSignOut={handleSignOut}
        onToggleMarket={toggleMarket}
        onOpenCompanyCabinet={openCompanyCabinet}
        onOpenCompanyCabinetFromBanner={openCompanyCabinetFromBanner}
        onOpenInviteModal={openInviteModal}
        onOpenSupplierShowcase={openSupplierShowcase}
      />

      <ProfileModalStack
        listingModalOpen={listingModalOpen}
        catalogModalOpen={catalogModalOpen}
        itemModalOpen={itemModalOpen}
        listingForm={listingForm}
        listingCartItems={listingCartItems}
        editingItem={editingItem}
        catalogSearch={catalogSearch}
        catalogResults={catalogResults}
        savingListing={savingListing}
        catalogLoading={catalogLoading}
        onCloseListingModal={closeListingModal}
        onPublishListing={publishListing}
        onChangeListingKind={handleListingKindChange}
        onChangeListingTitle={handleListingTitleChange}
        onChangeListingDescription={setListingDescription}
        onChangeListingPhone={setListingPhone}
        onChangeListingWhatsapp={setListingWhatsapp}
        onChangeListingEmail={setListingEmail}
        onInlineCatalogPick={handleInlineCatalogPick}
        onChangeCatalogSearch={setCatalogSearch}
        onLoadCatalog={loadCatalog}
        onCloseCatalogModal={closeCatalogModal}
        onCatalogModalPick={handleCatalogModalPick}
        onCloseItemModal={closeItemModal}
        onChangeEditingItemCity={handleEditingItemCityChange}
        onChangeEditingItemUom={handleEditingItemUomChange}
        onChangeEditingItemQty={handleEditingItemQtyChange}
        onChangeEditingItemPrice={handleEditingItemPriceChange}
        onConfirmEditingItem={handleEditingItemConfirm}
        businessOnboardingOpen={businessOnboardingOpen}
        businessStep={businessStep}
        savingCompany={savingCompany}
        companyForm={companyForm}
        onCloseBusinessWizard={closeBusinessWizard}
        onPrevBusinessStep={goPrevBusinessStep}
        onNextBusinessStep={goNextBusinessStep}
        onSubmitBusinessWizard={submitBusinessWizard}
        onChangeCompanyName={setCompanyNameInput}
        onChangeCompanyCity={setCompanyCityInput}
        onChangeCompanyLegalForm={setCompanyLegalFormInput}
        onChangeCompanyAddress={setCompanyAddressInput}
        onChangeCompanyIndustry={setCompanyIndustryInput}
        onChangeCompanyAboutShort={setCompanyAboutShortInput}
        onChangeCompanyPhoneMain={setCompanyPhoneMainInput}
        onChangeCompanyPhoneWhatsapp={setCompanyPhoneWhatsAppInput}
        onChangeCompanyEmail={setCompanyEmailInput}
        onChangeCompanySite={setCompanySiteInput}
        onChangeCompanyTelegram={setCompanyTelegramInput}
        onChangeCompanyWorkTime={setCompanyWorkTimeInput}
        onChangeCompanyContactPerson={setCompanyContactPersonInput}
        onChangeCompanyAboutFull={setCompanyAboutFullInput}
        onChangeCompanyServices={setCompanyServicesInput}
        onChangeCompanyRegions={setCompanyRegionsInput}
        onChangeCompanyClientsTypes={setCompanyClientsTypesInput}
        onChangeCompanyInn={setCompanyInnInput}
        onChangeCompanyBin={setCompanyBinInput}
        onChangeCompanyRegNumber={setCompanyRegNumberInput}
        onChangeCompanyBankDetails={setCompanyBankDetailsInput}
        onChangeCompanyLicensesInfo={setCompanyLicensesInfoInput}
        editProfileOpen={editProfileOpen}
        avatarLetter={avatarLetter}
        profileAvatarDraft={profileAvatarDraft}
        profileForm={profileForm}
        savingProfile={savingProfile}
        onCloseEditProfile={closeEditProfile}
        onPickProfileAvatar={pickProfileAvatar}
        onSaveProfile={saveProfileModal}
        onChangeProfileName={setProfileNameInput}
        onChangeProfilePhone={setProfilePhoneInput}
        onChangeProfileCity={setProfileCityInput}
        onChangeProfileBio={setProfileBioInput}
        onChangeProfilePosition={setProfilePositionInput}
        onChangeProfileTelegram={setProfileTelegramInput}
        onChangeProfileWhatsapp={setProfileWhatsappInput}
        inviteModalOpen={inviteModalOpen}
        savingInvite={savingInvite}
        inviteRole={inviteRole}
        inviteName={inviteName}
        invitePhone={invitePhone}
        inviteEmail={inviteEmail}
        inviteComment={inviteComment}
        lastInviteCode={lastInviteCode}
        onCloseInviteModal={closeInviteModal}
        onChangeInviteRole={setInviteRole}
        onChangeInviteName={setInviteName}
        onChangeInvitePhone={setInvitePhone}
        onChangeInviteEmail={setInviteEmail}
        onChangeInviteComment={setInviteComment}
        onSubmitInvite={handleInviteSubmit}
        onInviteAnother={handleInviteAnother}
        onCopyInviteCode={handleCopyInviteCode}
        onShareInviteWhatsApp={handleShareInviteWhatsApp}
        onShareInviteTelegram={handleShareInviteTelegram}
        editCompanyOpen={editCompanyOpen}
        companyTab={companyTab}
        onCloseEditCompany={closeEditCompany}
        onSaveCompany={saveCompanyModal}
        onSelectCompanyTab={handleCompanyTabSelect}
      />
    </View>
  );
}

export default ProfileContent;





