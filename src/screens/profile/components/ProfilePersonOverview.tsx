import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PROFILE_UI } from "../profile.helpers";
import { profileStyles } from "../profile.styles";
import { RowItem } from "./ProfilePrimitives";

export type ProfileCompletionItemViewModel = {
  key: string;
  label: string;
  done: boolean;
};

type ProfileSectionHeaderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

type ProfilePersonOverviewProps = {
  profileCompletionItems: ProfileCompletionItemViewModel[];
  profileCompletionDone: number;
  profileCompletionPercent: number;
  profileName: string;
  profilePhone: string;
  profileEmail: string;
  profileCity: string;
  companyName: string;
  listingsSummary: string;
  companyCardTitle: string;
  companyCardSubtitle: string;
  lastInviteCode: string | null;
  requisitesVisible: boolean;
  requisitesCompanyName: string;
  requisitesInn: string;
  requisitesAddress: string;
  requisitesBankDetails: string;
  requisitesContact: string;
  onOpenEditProfile: () => void;
  onOpenCompanyCard: () => void;
};

function ProfileSectionHeader(props: ProfileSectionHeaderProps) {
  return (
    <View style={profileStyles.profileSectionHeader}>
      <Ionicons name={props.icon} size={18} color={PROFILE_UI.accent} />
      <Text style={profileStyles.profileSectionHeaderText}>{props.title}</Text>
    </View>
  );
}

export function ProfilePersonOverview(props: ProfilePersonOverviewProps) {
  return (
    <>
      <View style={profileStyles.section}>
        <View style={profileStyles.completionCard}>
          <View style={profileStyles.completionHeader}>
            <View style={styles.completionHeaderMeta}>
              <Text style={profileStyles.completionTitle}>Готовность профиля</Text>
              <Text style={profileStyles.completionSubtitle}>
                Заполненный профиль лучше выглядит в системе и помогает быстрее работать с модулями GOX.
              </Text>
            </View>
            <Text style={profileStyles.completionPercent}>{props.profileCompletionPercent}%</Text>
          </View>
          <View style={profileStyles.completionBarTrack}>
            <View
              style={[
                profileStyles.completionBarFill,
                { width: `${props.profileCompletionPercent}%` },
              ]}
            />
          </View>
          <View style={profileStyles.completionList}>
            {props.profileCompletionItems.map((item) => (
              <View key={item.key} style={profileStyles.completionItem}>
                <Ionicons
                  name={item.done ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={item.done ? PROFILE_UI.accent : PROFILE_UI.sub}
                />
                <Text
                  style={[
                    profileStyles.completionItemText,
                    item.done && profileStyles.completionItemTextDone,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          {props.profileCompletionDone < props.profileCompletionItems.length ? (
            <Pressable
              testID="profile-person-completion-action"
              style={profileStyles.completionAction}
              onPress={props.onOpenEditProfile}
            >
              <Text style={profileStyles.completionActionText}>Заполнить профиль</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={profileStyles.section}>
        <ProfileSectionHeader icon="person-outline" title="Информация" />
        <View style={profileStyles.sectionCard}>
          <RowItem label="Имя" value={props.profileName} />
          <RowItem label="Телефон" value={props.profilePhone} />
          <RowItem label="Email" value={props.profileEmail} />
          <RowItem label="Город" value={props.profileCity} />
          <RowItem label="Компания" value={props.companyName} />
          <RowItem label="Объявления" value={props.listingsSummary} last />
        </View>
      </View>

      <View style={profileStyles.section}>
        <ProfileSectionHeader icon="business-outline" title="Компания и команда" />
        <Pressable
          testID="profile-company-card"
          accessibilityLabel="profile_company_card"
          style={profileStyles.profileActionCard}
          onPress={props.onOpenCompanyCard}
        >
          <View style={profileStyles.profileActionTextWrap}>
            <Text style={profileStyles.profileActionTitle}>{props.companyCardTitle}</Text>
            <Text style={profileStyles.profileActionSubtitle}>{props.companyCardSubtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={PROFILE_UI.sub} />
        </Pressable>

        {props.lastInviteCode ? (
          <View style={profileStyles.profileHintCard}>
            <Text style={profileStyles.profileHintTitle}>Последний код приглашения</Text>
            <Text style={profileStyles.profileHintValue}>{props.lastInviteCode}</Text>
            <Text style={profileStyles.profileHintSubtitle}>
              Используйте код для подключения сотрудников к текущей компании.
            </Text>
          </View>
        ) : null}
      </View>

      {props.requisitesVisible ? (
        <View style={profileStyles.section}>
          <ProfileSectionHeader icon="document-text-outline" title="Реквизиты" />
          <View style={profileStyles.sectionCard}>
            <RowItem label="Компания" value={props.requisitesCompanyName} />
            <RowItem label="ИНН" value={props.requisitesInn} />
            <RowItem label="Адрес" value={props.requisitesAddress} />
            <RowItem label="Банк / реквизиты" value={props.requisitesBankDetails} />
            <RowItem label="Контакт" value={props.requisitesContact} last />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  completionHeaderMeta: {
    flex: 1,
  },
});
