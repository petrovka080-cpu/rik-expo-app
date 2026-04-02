import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import {
  buildAppAccessModel,
  type AppAccessSourceSnapshot,
  type AppContext,
} from "../../lib/appAccessModel";
import {
  loadStoredActiveContext,
  persistActiveContext,
} from "../../lib/appAccessContextStorage";
import {
  AUTH_LOGIN_ROUTE,
  MARKET_TAB_ROUTE,
  OFFICE_TAB_ROUTE,
  SELLER_ROUTE,
  buildAddListingRoute,
} from "../../lib/navigation/coreRoutes";
import {
  getErrorMessage,
  getProfileDisplayName,
  getProfileRoleColor,
  getProfileRoleLabel,
} from "./profile.helpers";
import { profileStyles } from "./profile.styles";
import {
  loadProfileScreenData,
  saveProfileDetails,
  signOutProfileSession,
} from "./profile.services";
import type { Company, UserProfile } from "./profile.types";
import { EditProfileModal } from "./components/EditProfileModal";
import { ProfileMainSections } from "./components/ProfileMainSections";
import { useProfileForm } from "./hooks/useProfileForm";

const styles = profileStyles;

const buildOfficeRolesLabel = (roles: string[]): string => {
  if (roles.length === 0) return "Нет";
  return roles.map((role) => getProfileRoleLabel(role)).join(", ");
};

const buildActiveContextDescription = (params: {
  activeContext: AppContext;
  hasOfficeAccess: boolean;
  officeRolesLabel: string;
}): string =>
  params.activeContext === "office"
    ? `Сейчас активен Office. Доступные рабочие роли: ${params.officeRolesLabel}.`
    : params.hasOfficeAccess
      ? "Сейчас активен Market. Office-доступ сохранён, но не выбран как текущий контекст."
      : "Сейчас активен Market. Это единственный доступный контекст для текущего аккаунта.";

export function ProfileContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [accessSourceSnapshot, setAccessSourceSnapshot] =
    useState<AppAccessSourceSnapshot | null>(null);
  const [requestedActiveContext, setRequestedActiveContext] =
    useState<AppContext | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

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

  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      try {
        setLoading(true);
        const result = await loadProfileScreenData();
        const storedActiveContext = await loadStoredActiveContext(
          result.profile.user_id,
        );
        if (!alive) return;

        setProfile(result.profile);
        setCompany(result.company);
        setProfileRole(result.profileRole);
        setProfileEmail(result.profileEmail);
        setProfileAvatarUrl(result.profileAvatarUrl);
        setProfileAvatarDraft(result.profileAvatarUrl);
        setAccessSourceSnapshot(result.accessSourceSnapshot);
        setRequestedActiveContext(storedActiveContext);
      } catch (error: unknown) {
        if (!alive) return;
        Alert.alert("Профиль", getErrorMessage(error));
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadAll();

    return () => {
      alive = false;
    };
  }, [setProfileAvatarDraft]);

  const accessModel = useMemo(
    () =>
      buildAppAccessModel({
        userId: profile?.user_id ?? null,
        authRole: accessSourceSnapshot?.authRole ?? null,
        resolvedRole:
          accessSourceSnapshot?.resolvedRole ?? profileRole ?? null,
        usageMarket:
          accessSourceSnapshot?.usageMarket ?? Boolean(profile?.usage_market),
        usageBuild:
          accessSourceSnapshot?.usageBuild ?? Boolean(profile?.usage_build),
        ownedCompanyId:
          accessSourceSnapshot?.ownedCompanyId ?? company?.id ?? null,
        companyMemberships: accessSourceSnapshot?.companyMemberships ?? [],
        listingsCount: accessSourceSnapshot?.listingsCount ?? 0,
        requestedActiveContext,
      }),
    [
      accessSourceSnapshot,
      company?.id,
      profile?.usage_build,
      profile?.usage_market,
      profile?.user_id,
      profileRole,
      requestedActiveContext,
    ],
  );

  const sellerListingsCount = accessSourceSnapshot?.listingsCount ?? 0;
  const hasSellerAreaEntry = sellerListingsCount > 0;
  const displayRole = accessModel.activeOfficeRole ?? profileRole;
  const profileName = getProfileDisplayName({
    fullName: profile?.full_name,
    email: profileEmail,
    companyName: company?.name,
    userId: profile?.user_id,
  });
  const roleLabel = getProfileRoleLabel(displayRole);
  const roleColor = getProfileRoleColor(displayRole);
  const avatarLetter = profileName[0]?.toUpperCase() || "G";
  const accountSubtitle =
    [company?.name?.trim(), profileEmail].filter(Boolean).join(" / ") ||
    "Аккаунт GOX";
  const officeRolesLabel = buildOfficeRolesLabel(
    accessModel.availableOfficeRoles,
  );
  const activeContextDescription = buildActiveContextDescription({
    activeContext: accessModel.activeContext,
    hasOfficeAccess: accessModel.hasOfficeAccess,
    officeRolesLabel,
  });

  const openEditProfile = useCallback(() => {
    if (!profile) return;
    hydrateProfileForm(profile, profileAvatarUrl);
    setEditProfileOpen(true);
  }, [hydrateProfileForm, profile, profileAvatarUrl]);

  const openMarket = useCallback(() => {
    router.push(MARKET_TAB_ROUTE);
  }, [router]);

  const openAddListing = useCallback(() => {
    router.push(buildAddListingRoute());
  }, [router]);

  const openSellerArea = useCallback(() => {
    router.push(SELLER_ROUTE);
  }, [router]);

  const openOfficeAccess = useCallback(() => {
    router.push(OFFICE_TAB_ROUTE);
  }, [router]);

  const closeEditProfile = useCallback(() => {
    resetProfileAvatarDraft(profileAvatarUrl);
    setEditProfileOpen(false);
  }, [profileAvatarUrl, resetProfileAvatarDraft]);

  const pickProfileAvatar = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Профиль",
            "Разрешите доступ к фото, чтобы загрузить аватар.",
          );
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
    } catch (error: unknown) {
      Alert.alert(
        "Профиль",
        error instanceof Error
          ? error.message
          : "Не удалось выбрать изображение.",
      );
    }
  }, [setProfileAvatarDraft]);

  const saveProfileModal = useCallback(async () => {
    if (!profile) return;

    try {
      setSavingProfile(true);
      const result = await saveProfileDetails({
        profile,
        profileAvatarUrl,
        profileAvatarDraft,
        modeMarket: profile.usage_market,
        modeBuild: profile.usage_build,
        form: {
          profileNameInput,
          profilePhoneInput,
          profileCityInput,
          profileBioInput,
          profileTelegramInput,
          profileWhatsappInput,
          profilePositionInput,
        },
      });

      setProfile(result.profile);
      setProfileAvatarUrl(result.profileAvatarUrl);
      resetProfileAvatarDraft(result.profileAvatarUrl);
      setAccessSourceSnapshot((prev) =>
        prev
          ? {
              ...prev,
              usageMarket: result.profile.usage_market,
              usageBuild: result.profile.usage_build,
              userId: result.profile.user_id,
            }
          : prev,
      );
      setEditProfileOpen(false);
    } catch (error: unknown) {
      Alert.alert("Профиль", getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }, [
    profile,
    profileAvatarDraft,
    profileAvatarUrl,
    profileBioInput,
    profileCityInput,
    profileNameInput,
    profilePhoneInput,
    profilePositionInput,
    profileTelegramInput,
    profileWhatsappInput,
    resetProfileAvatarDraft,
  ]);

  const handleSelectActiveContext = useCallback(
    (nextContext: AppContext) => {
      if (!accessModel.availableContexts.includes(nextContext)) return;
      setRequestedActiveContext(nextContext);
      void persistActiveContext(profile?.user_id ?? null, nextContext);
    },
    [accessModel.availableContexts, profile?.user_id],
  );

  const openActiveContext = useCallback(() => {
    const push = router.push as unknown as (href: string) => void;
    if (accessModel.activeContext === "office") {
      push(String(OFFICE_TAB_ROUTE));
      return;
    }
    push(String(MARKET_TAB_ROUTE));
  }, [accessModel.activeContext, router]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Выйти из аккаунта", "Завершить текущую сессию GOX?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutProfileSession();
            router.replace(AUTH_LOGIN_ROUTE);
          } catch (error: unknown) {
            Alert.alert("Профиль", getErrorMessage(error));
          }
        },
      },
    ]);
  }, [router]);

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Загружаем профиль...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ProfileMainSections
        profileAvatarUrl={profileAvatarUrl}
        avatarLetter={avatarLetter}
        profileName={profileName}
        roleLabel={roleLabel}
        roleColor={roleColor}
        accountSubtitle={accountSubtitle}
        profile={profile}
        company={company}
        profileEmail={profileEmail}
        accessModel={accessModel}
        officeRolesLabel={officeRolesLabel}
        activeContextDescription={activeContextDescription}
        hasSellerAreaEntry={hasSellerAreaEntry}
        onOpenEditProfile={openEditProfile}
        onOpenMarket={openMarket}
        onOpenAddListing={openAddListing}
        onOpenSellerArea={openSellerArea}
        onOpenOfficeAccess={openOfficeAccess}
        onSelectActiveContext={handleSelectActiveContext}
        onOpenActiveContext={openActiveContext}
        onSignOut={handleSignOut}
      />

      <EditProfileModal
        visible={editProfileOpen}
        avatarLetter={avatarLetter}
        profileAvatarDraft={profileAvatarDraft}
        profileForm={profileForm}
        savingProfile={savingProfile}
        onRequestClose={closeEditProfile}
        onPickProfileAvatar={pickProfileAvatar}
        onSave={saveProfileModal}
        onChangeProfileName={setProfileNameInput}
        onChangeProfilePhone={setProfilePhoneInput}
        onChangeProfileCity={setProfileCityInput}
        onChangeProfileBio={setProfileBioInput}
        onChangeProfilePosition={setProfilePositionInput}
        onChangeProfileTelegram={setProfileTelegramInput}
        onChangeProfileWhatsapp={setProfileWhatsappInput}
      />
    </View>
  );
}

export default ProfileContent;
