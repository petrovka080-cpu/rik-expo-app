import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppAccessModel, AppContext } from "../../../lib/appAccessModel";
import { ProfileOtaDiagnosticsCard } from "@/src/features/profile/ProfileOtaDiagnosticsCard";
import { PROFILE_UI as UI } from "../profile.helpers";
import { profileStyles } from "../profile.styles";
import type { Company, UserProfile } from "../profile.types";
import { MenuActionRow, RowItem } from "./ProfilePrimitives";

const styles = profileStyles;

const COPY = {
  yes: "Есть",
  no: "Нет",
  unknown: "Не указан",
  profileTitle: "Профиль",
  profileSubtitle:
    "Личные данные, доступы, активный контекст и текущая сессия GOX.",
  edit: "Редактировать",
  name: "Имя",
  phone: "Телефон",
  city: "Город",
  currentContext: "Текущий контекст",
  companyContextPrefix: "Есть: ",
  openMarket: "Открыть Market",
  openOffice: "Открыть Office и компанию",
  oneContextHint:
    "Доступен только один контекст, поэтому переключатель скрыт.",
  editData: "Редактировать данные",
  signOutTitle: "Выйти из аккаунта",
  signOutSubtitle:
    "Завершить текущую сессию и вернуться на экран входа.",
  marketContextSubtitle:
    "Поиск, просмотр товаров и основной market flow.",
  officeContextSubtitle: "Рабочие роли, Office hub и ERP-модули.",
  nextStepsTitle: "Что дальше",
  marketEntryTitle: "Перейти в Market",
  marketEntrySubtitle:
    "Смотреть товары, искать по категориям и открывать карточки.",
  addListingTitle: "Создать объявление",
  addListingSubtitle:
    "Опубликовать предложение в market и начать seller-сценарий.",
  sellerEntryTitle: "Открыть кабинет продавца",
  sellerEntrySubtitle:
    "Мои объявления, статусы публикации и seller-инструменты в отдельном контуре.",
  officeEntryReadyTitle: "Открыть Office и компанию",
  officeEntryReadySubtitle:
    "Компания, сотрудники, invite-ы, роли и вход в Office живут в отдельном контуре.",
  officeEntryBootstrapTitle: "Создать компанию",
  officeEntryBootstrapSubtitle:
    "Создайте компанию, чтобы открыть Office access и получить стартовую роль директора.",
} as const;

type ProfileMainSectionsProps = {
  profileAvatarUrl: string | null;
  avatarLetter: string;
  profileName: string;
  roleLabel: string;
  roleColor: string;
  accountSubtitle: string;
  profile: UserProfile;
  company: Company | null;
  profileEmail: string | null;
  accessModel: AppAccessModel;
  officeRolesLabel: string;
  activeContextDescription: string;
  hasSellerAreaEntry: boolean;
  onOpenEditProfile: () => void;
  onOpenMarket: () => void;
  onOpenAddListing: () => void;
  onOpenSellerArea: () => void;
  onOpenOfficeAccess: () => void;
  onSelectActiveContext: (context: AppContext) => void;
  onOpenActiveContext: () => void;
  onSignOut: () => void;
};

const formatAccessValue = (value: boolean): string => (value ? COPY.yes : COPY.no);

export function ProfileMainSections({
  profileAvatarUrl,
  avatarLetter,
  profileName,
  roleLabel,
  roleColor,
  accountSubtitle,
  profile,
  company,
  profileEmail,
  accessModel,
  officeRolesLabel,
  activeContextDescription,
  hasSellerAreaEntry,
  onOpenEditProfile,
  onOpenMarket,
  onOpenAddListing,
  onOpenSellerArea,
  onOpenOfficeAccess,
  onSelectActiveContext,
  onOpenActiveContext,
  onSignOut,
}: ProfileMainSectionsProps) {
  const profileHeaderAvatarToneStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: `${roleColor}22`,
      borderColor: `${roleColor}55`,
    }),
    [roleColor],
  );

  const profileHeaderRoleBadgeStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: roleColor,
    }),
    [roleColor],
  );

  const marketContextActive = accessModel.activeContext === "market";
  const officeContextActive = accessModel.activeContext === "office";
  const contextSwitchVisible = accessModel.availableContexts.length > 1;
  const activeContextLabel = marketContextActive ? "Market" : "Office";
  const companyContextValue = company?.name?.trim()
    ? `${COPY.companyContextPrefix}${company.name.trim()}`
    : formatAccessValue(accessModel.hasCompanyContext);
  const activeContextCtaLabel = marketContextActive
    ? COPY.openMarket
    : COPY.openOffice;
  const officeEntryTitle =
    accessModel.hasOfficeAccess || accessModel.hasCompanyContext
      ? COPY.officeEntryReadyTitle
      : COPY.officeEntryBootstrapTitle;
  const officeEntrySubtitle =
    accessModel.hasOfficeAccess || accessModel.hasCompanyContext
      ? COPY.officeEntryReadySubtitle
      : COPY.officeEntryBootstrapSubtitle;

  return (
    <ScrollView
      style={styles.scrollFill}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.profileHeaderCard}>
        <Pressable
          testID="profile-edit-open"
          onPress={onOpenEditProfile}
          style={styles.profileHeaderAvatarWrap}
        >
          <View
            style={[styles.profileHeaderAvatar, profileHeaderAvatarToneStyle]}
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
          style={[styles.profileHeaderRoleBadge, profileHeaderRoleBadgeStyle]}
        >
          <Text style={styles.profileHeaderRoleText}>{roleLabel}</Text>
        </View>
        <Text style={styles.profileHeaderSubtitle}>{accountSubtitle}</Text>
      </View>

      <View style={styles.profileTitleRow}>
        <View style={styles.profileTitleMeta}>
          <Text style={styles.profileTitle}>{COPY.profileTitle}</Text>
          <Text style={styles.profileTitleSubtitle}>{COPY.profileSubtitle}</Text>
        </View>
        <Pressable style={styles.profileEditButton} onPress={onOpenEditProfile}>
          <Text style={styles.profileEditButtonText}>{COPY.edit}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons name="person-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>Identity</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem label={COPY.name} value={profileName} />
          <RowItem
            label={COPY.phone}
            value={profile.phone?.trim() || COPY.unknown}
          />
          <RowItem label="Email" value={profileEmail || COPY.unknown} />
          <RowItem
            label={COPY.city}
            value={profile.city?.trim() || COPY.unknown}
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={UI.accent}
          />
          <Text style={styles.profileSectionHeaderText}>Access Summary</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem
            label="Market"
            value={formatAccessValue(accessModel.hasMarketAccess)}
          />
          <RowItem
            label="Office"
            value={formatAccessValue(accessModel.hasOfficeAccess)}
          />
          <RowItem label="Company context" value={companyContextValue} />
          <RowItem
            label="Seller capability"
            value={formatAccessValue(accessModel.hasSellerCapability)}
          />
          <RowItem label="Office roles" value={officeRolesLabel} last />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons name="compass-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>
            {COPY.nextStepsTitle}
          </Text>
        </View>

        {accessModel.hasMarketAccess ? (
          <Pressable
            testID="profile-open-market-entry"
            style={styles.profileActionCard}
            onPress={onOpenMarket}
          >
            <View style={styles.profileActionTextWrap}>
              <Text style={styles.profileActionTitle}>
                {COPY.marketEntryTitle}
              </Text>
              <Text style={styles.profileActionSubtitle}>
                {COPY.marketEntrySubtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI.accent} />
          </Pressable>
        ) : null}

        {accessModel.hasMarketAccess ? (
          <Pressable
            testID="profile-open-add-listing"
            style={[styles.profileActionCard, styles.companyActionsRowTop]}
            onPress={onOpenAddListing}
          >
            <View style={styles.profileActionTextWrap}>
              <Text style={styles.profileActionTitle}>
                {COPY.addListingTitle}
              </Text>
              <Text style={styles.profileActionSubtitle}>
                {COPY.addListingSubtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI.accent} />
          </Pressable>
        ) : null}

        {hasSellerAreaEntry ? (
          <Pressable
            testID="profile-open-seller-area"
            style={[styles.profileActionCard, styles.companyActionsRowTop]}
            onPress={onOpenSellerArea}
          >
            <View style={styles.profileActionTextWrap}>
              <Text style={styles.profileActionTitle}>
                {COPY.sellerEntryTitle}
              </Text>
              <Text style={styles.profileActionSubtitle}>
                {COPY.sellerEntrySubtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI.accent} />
          </Pressable>
        ) : null}

        <Pressable
          testID="profile-open-office-access"
          style={[styles.profileActionCard, styles.companyActionsRowTop]}
          onPress={onOpenOfficeAccess}
        >
          <View style={styles.profileActionTextWrap}>
            <Text style={styles.profileActionTitle}>{officeEntryTitle}</Text>
            <Text style={styles.profileActionSubtitle}>
              {officeEntrySubtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={UI.accent} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={UI.accent}
          />
          <Text style={styles.profileSectionHeaderText}>Active Context</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem label={COPY.currentContext} value={activeContextLabel} />
          <Text style={[styles.companyText, { marginTop: 10 }]}>
            {activeContextDescription}
          </Text>

          {contextSwitchVisible ? (
            <View style={styles.modeSwitchRow}>
              <Pressable
                testID="profile-context-market"
                style={[
                  styles.modeSwitchBtn,
                  marketContextActive && styles.modeSwitchBtnActive,
                ]}
                onPress={() => onSelectActiveContext("market")}
              >
                <Text
                  style={[
                    styles.modeSwitchText,
                    marketContextActive && styles.modeSwitchTextActive,
                  ]}
                >
                  Market
                </Text>
                <Text style={styles.modeSwitchSub}>
                  {COPY.marketContextSubtitle}
                </Text>
              </Pressable>

              <Pressable
                testID="profile-context-office"
                style={[
                  styles.modeSwitchBtn,
                  officeContextActive && styles.modeSwitchBtnActive,
                ]}
                onPress={() => onSelectActiveContext("office")}
              >
                <Text
                  style={[
                    styles.modeSwitchText,
                    officeContextActive && styles.modeSwitchTextActive,
                  ]}
                >
                  Office
                </Text>
                <Text style={styles.modeSwitchSub}>
                  {COPY.officeContextSubtitle}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.chipHint, styles.chipHintSpaced]}>
              {COPY.oneContextHint}
            </Text>
          )}

          <Pressable
            testID="profile-open-active-context"
            style={[styles.companyBtn, styles.companyActionsRowTop]}
            onPress={onOpenActiveContext}
          >
            <Text style={styles.companyBtnText}>{activeContextCtaLabel}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons name="settings-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>Session</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem label="User ID" value={accessModel.userId || COPY.unknown} />
          <RowItem label="Account" value={profileEmail || COPY.unknown} last />
          <View style={styles.companyActionsRow}>
            <Pressable
              style={[styles.companyBtn, styles.companyBtnSecondary]}
              onPress={onOpenEditProfile}
            >
              <Text style={styles.companyBtnTextSecondary}>
                {COPY.editData}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.companyActionsRow, styles.companyActionsRowTop]}>
            <MenuActionRow
              icon="log-out-outline"
              title={COPY.signOutTitle}
              subtitle={COPY.signOutSubtitle}
              onPress={onSignOut}
              danger
              last
            />
          </View>
        </View>
      </View>

      <View style={styles.section} testID="profile-ota-diagnostics-section">
        <View style={styles.profileSectionHeader}>
          <Ionicons name="cloud-download-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>Release & OTA</Text>
        </View>
        <ProfileOtaDiagnosticsCard />
      </View>

      <Text style={styles.profileFooterText}>GOX v1.0.0</Text>
    </ScrollView>
  );
}

export default ProfileMainSections;
