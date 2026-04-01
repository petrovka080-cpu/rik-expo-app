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
import { PROFILE_UI as UI } from "../profile.helpers";
import { profileStyles } from "../profile.styles";
import type { Company, UserProfile } from "../profile.types";
import { MenuActionRow, RowItem } from "./ProfilePrimitives";

const styles = profileStyles;

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
  onOpenEditProfile: () => void;
  onSelectActiveContext: (context: AppContext) => void;
  onOpenActiveContext: () => void;
  onSignOut: () => void;
};

const formatAccessValue = (value: boolean): string => (value ? "Есть" : "Нет");

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
  onOpenEditProfile,
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
    ? `Есть: ${company.name.trim()}`
    : formatAccessValue(accessModel.hasCompanyContext);
  const activeContextCtaLabel = marketContextActive
    ? "Открыть Market"
    : "Открыть Office";

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
          <Text style={styles.profileTitle}>Профиль</Text>
          <Text style={styles.profileTitleSubtitle}>
            Личные данные, доступы, активный контекст и текущая сессия GOX.
          </Text>
        </View>
        <Pressable style={styles.profileEditButton} onPress={onOpenEditProfile}>
          <Text style={styles.profileEditButtonText}>Редактировать</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons name="person-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>Identity</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem label="Имя" value={profileName} />
          <RowItem
            label="Телефон"
            value={profile.phone?.trim() || "Не указан"}
          />
          <RowItem label="Email" value={profileEmail || "Не указан"} />
          <RowItem
            label="Город"
            value={profile.city?.trim() || "Не указан"}
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
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={UI.accent}
          />
          <Text style={styles.profileSectionHeaderText}>Active Context</Text>
        </View>
        <View style={styles.sectionCard}>
          <RowItem label="Текущий контекст" value={activeContextLabel} />
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
                  Маркетплейс, витрина и пользовательские сценарии.
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
                  Рабочие роли, Office hub и ERP-модули.
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.chipHint, styles.chipHintSpaced]}>
              Доступен только один контекст, поэтому переключатель скрыт.
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
          <RowItem label="User ID" value={accessModel.userId || "Не указан"} />
          <RowItem label="Account" value={profileEmail || "Не указан"} last />
          <View style={styles.companyActionsRow}>
            <Pressable
              style={[styles.companyBtn, styles.companyBtnSecondary]}
              onPress={onOpenEditProfile}
            >
              <Text style={styles.companyBtnTextSecondary}>
                Редактировать данные
              </Text>
            </Pressable>
          </View>
          <View style={[styles.companyActionsRow, styles.companyActionsRowTop]}>
            <MenuActionRow
              icon="log-out-outline"
              title="Выйти из аккаунта"
              subtitle="Завершить текущую сессию и вернуться на экран входа."
              onPress={onSignOut}
              danger
              last
            />
          </View>
        </View>
      </View>

      <Text style={styles.profileFooterText}>GOX v1.0.0</Text>
    </ScrollView>
  );
}

export default ProfileMainSections;
