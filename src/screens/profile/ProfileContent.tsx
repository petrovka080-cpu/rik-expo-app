import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  AUTH_LOGIN_ROUTE,
  buildAssistantRoute,
  buildSupplierShowcaseRoute,
  DIRECTOR_ROUTE,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
  SUPPLIER_MAP_ROUTE,
} from "../../lib/navigation/coreRoutes";
import {
  PROFILE_UI as UI,
  buildProfileAssistantPrompt,
  generateInviteCode,
  getErrorMessage,
} from "./profile.helpers";
import { profileStyles } from "./profile.styles";
import { ProfilePersonOverview } from "./components/ProfilePersonOverview";
import { LabeledInput, MenuActionRow, RowItem } from "./components/ProfilePrimitives";
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
  const updateUsage = async (nextMarket: boolean, nextBuild: boolean) => {
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
  };
  const toggleMarket = () => updateUsage(!modeMarket, modeBuild);

  // НОВАЯ ЛОГИКА: если включаем «веду бизнес» — запускаем wizard
  const handlePressBuildCard = () => {
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
  const openCompanyCabinet = async () => {
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
  };
  const openListingModal = () => {
    if (!profile) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    prepareListingForm({ profile, company, profileMode });
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
  const openEditProfile = () => {
    if (!profile) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hydrateProfileForm(profile, profileAvatarUrl);
    setEditProfileOpen(true);
  };

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
    companyCompletionDone,
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
  const openProfileAssistant = () => {
    router.push(
      buildAssistantRoute({
        prompt: assistantPrompt,
        autoSend: "1",
        context: "profile",
      }),
    );
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
            testID="profile-edit-open"
            accessibilityLabel="profile_edit_open"
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
            <ProfilePersonOverview
              profileCompletionItems={profileCompletionItems}
              profileCompletionDone={profileCompletionDone}
              profileCompletionPercent={profileCompletionPercent}
              profileName={profileName}
              profilePhone={profile?.phone?.trim() || "Не указан"}
              profileEmail={profileEmail || "Не указан"}
              profileCity={profile?.city?.trim() || company?.city?.trim() || "Не указан"}
              companyName={company?.name?.trim() || "Не подключена"}
              listingsSummary={listingsSummary}
              companyCardTitle={companyCardTitle}
              companyCardSubtitle={companyCardSubtitle}
              lastInviteCode={lastInviteCode}
              requisitesVisible={requisitesVisible}
              requisitesCompanyName={company?.name?.trim() || "Не указана"}
              requisitesInn={company?.inn?.trim() || "—"}
              requisitesAddress={company?.address?.trim() || "—"}
              requisitesBankDetails={company?.bank_details?.trim() || "—"}
              requisitesContact={company?.phone_main?.trim() || profile?.phone?.trim() || "Не указан"}
              onOpenEditProfile={openEditProfile}
              onOpenCompanyCard={company ? openCompanyCabinet : handlePressBuildCard}
            />

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
                  onPress={() => router.push(MARKET_TAB_ROUTE)}
                />
                <MenuActionRow
                  testID="profile-listing-open"
                  accessibilityLabel="profile_listing_open"
                  icon="add-circle-outline"
                  title="Добавить объявление"
                  subtitle="Откройте текущую форму публикации товара или услуги."
                  onPress={openListingModal}
                />
                <MenuActionRow
                  icon="map-outline"
                  title="Карта спроса и поставщиков"
                  subtitle="Поставщики, спрос и география позиций на карте."
                  onPress={() => router.push(SUPPLIER_MAP_ROUTE)}
                />
                <MenuActionRow
                  icon="hammer-outline"
                  title="Торги"
                  subtitle="Актуальные торги, позиции и переход к деталям."
                  onPress={() => router.push(MARKET_AUCTIONS_ROUTE)}
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
                      onPress={() => router.push(buildSupplierShowcaseRoute())}
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
                        onPress={() => router.push(MARKET_TAB_ROUTE)}
                      >
                        <Text style={styles.companyBtnTextSecondary}>
                          Открыть маркет
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.companyBtn, styles.companyBtnSecondary]}
                        onPress={() => router.push(MARKET_AUCTIONS_ROUTE)}
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
                          getErrorMessage(e)
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

export default ProfileContent;





