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

const COPY = {
  yes: "\u0415\u0441\u0442\u044c",
  no: "\u041d\u0435\u0442",
  unknown: "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d",
  profileTitle: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
  profileSubtitle:
    "\u041b\u0438\u0447\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435, \u0434\u043e\u0441\u0442\u0443\u043f\u044b, \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442 \u0438 \u0442\u0435\u043a\u0443\u0449\u0430\u044f \u0441\u0435\u0441\u0441\u0438\u044f GOX.",
  edit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  name: "\u0418\u043c\u044f",
  phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
  city: "\u0413\u043e\u0440\u043e\u0434",
  currentContext: "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442",
  companyContextPrefix: "\u0415\u0441\u0442\u044c: ",
  openMarket: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c Market",
  openOffice: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c Office \u0438 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e",
  oneContextHint:
    "\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0434\u0438\u043d \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442, \u043f\u043e\u044d\u0442\u043e\u043c\u0443 \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0430\u0442\u0435\u043b\u044c \u0441\u043a\u0440\u044b\u0442.",
  editData: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435",
  signOutTitle: "\u0412\u044b\u0439\u0442\u0438 \u0438\u0437 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430",
  signOutSubtitle:
    "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0442\u0435\u043a\u0443\u0449\u0443\u044e \u0441\u0435\u0441\u0441\u0438\u044e \u0438 \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043d\u0430 \u044d\u043a\u0440\u0430\u043d \u0432\u0445\u043e\u0434\u0430.",
  marketContextSubtitle:
    "\u041f\u043e\u0438\u0441\u043a, \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0442\u043e\u0432\u0430\u0440\u043e\u0432 \u0438 \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 market flow.",
  officeContextSubtitle:
    "\u0420\u0430\u0431\u043e\u0447\u0438\u0435 \u0440\u043e\u043b\u0438, Office hub \u0438 ERP-\u043c\u043e\u0434\u0443\u043b\u0438.",
  sellerEntrySubtitle:
    "\u041c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f, \u0441\u0442\u0430\u0442\u0443\u0441\u044b \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0438 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0430 \u0432 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u043c \u0440\u0430\u0437\u0434\u0435\u043b\u0435.",
  officeEntryReadySubtitle:
    "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f, \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0438, invite-\u044b, roles \u0438 \u0432\u0445\u043e\u0434 \u0432 Office \u0432 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u043c \u043a\u043e\u043d\u0442\u0443\u0440\u0435.",
  officeEntryBootstrapSubtitle:
    "\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c Office access \u0438 \u0441\u0442\u0430\u0440\u0442\u043e\u0432\u0443\u044e \u0440\u043e\u043b\u044c \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440\u0430.",
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
  onOpenEditProfile: () => void;
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
  onOpenEditProfile,
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

      {accessModel.hasSellerCapability ? (
        <View style={styles.section}>
          <View style={styles.profileSectionHeader}>
            <Ionicons name="storefront-outline" size={18} color={UI.accent} />
            <Text style={styles.profileSectionHeaderText}>
              \u041a\u0430\u0431\u0438\u043d\u0435\u0442 \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0430
            </Text>
          </View>
          <Pressable
            testID="profile-open-seller-area"
            style={styles.profileActionCard}
            onPress={onOpenSellerArea}
          >
            <View style={styles.profileActionTextWrap}>
              <Text style={styles.profileActionTitle}>
                \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0430
              </Text>
              <Text style={styles.profileActionSubtitle}>
                {COPY.sellerEntrySubtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI.accent} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.profileSectionHeader}>
          <Ionicons name="briefcase-outline" size={18} color={UI.accent} />
          <Text style={styles.profileSectionHeaderText}>
            Office и компания
          </Text>
        </View>
        <Pressable
          testID="profile-open-office-access"
          style={styles.profileActionCard}
          onPress={onOpenOfficeAccess}
        >
          <View style={styles.profileActionTextWrap}>
            <Text style={styles.profileActionTitle}>
              Открыть контур Office access
            </Text>
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

      <Text style={styles.profileFooterText}>GOX v1.0.0</Text>
    </ScrollView>
  );
}

export default ProfileMainSections;
