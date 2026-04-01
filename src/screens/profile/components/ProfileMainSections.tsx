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

import { PROFILE_UI as UI } from "../profile.helpers";
import { profileStyles } from "../profile.styles";
import type { Company, ProfileMode, UserProfile } from "../profile.types";
import {
  ProfilePersonOverview,
  type ProfileCompletionItemViewModel,
} from "./ProfilePersonOverview";
import { MenuActionRow, RowItem } from "./ProfilePrimitives";

const styles = profileStyles;

type ProfileMainSectionsProps = {
  profileMode: ProfileMode;
  profileAvatarUrl: string | null;
  avatarLetter: string;
  profileName: string;
  roleLabel: string;
  roleColor: string;
  accountSubtitle: string;
  profile: UserProfile;
  company: Company | null;
  profileEmail: string | null;
  lastInviteCode: string | null;
  requisitesVisible: boolean;
  listingsSummary: string;
  companyCardTitle: string;
  companyCardSubtitle: string;
  profileCompletionItems: ProfileCompletionItemViewModel[];
  profileCompletionDone: number;
  profileCompletionPercent: number;
  companyCompletionItems: ProfileCompletionItemViewModel[];
  companyCompletionPercent: number;
  justCreatedCompany: boolean;
  modeMarket: boolean;
  modeBuild: boolean;
  savingUsage: boolean;
  onOpenEditProfile: () => void;
  onSelectPersonMode: () => void;
  onSelectCompanyMode: () => void;
  onOpenPersonCompanyCard: () => void;
  onOpenMarket: () => void;
  onOpenListingModal: () => void;
  onOpenSupplierMap: () => void;
  onOpenMarketAuctions: () => void;
  onOpenProfileAssistant: () => void;
  onPressBuildCard: () => void;
  onOpenEditCompany: () => void;
  onSignOut: () => void;
  onToggleMarket: () => void;
  onOpenCompanyCabinet: () => void;
  onOpenCompanyCabinetFromBanner: () => void;
  onOpenInviteModal: () => void;
  onOpenSupplierShowcase: () => void;
};

export function ProfileMainSections({
  profileMode,
  profileAvatarUrl,
  avatarLetter,
  profileName,
  roleLabel,
  roleColor,
  accountSubtitle,
  profile,
  company,
  profileEmail,
  lastInviteCode,
  requisitesVisible,
  listingsSummary,
  companyCardTitle,
  companyCardSubtitle,
  profileCompletionItems,
  profileCompletionDone,
  profileCompletionPercent,
  companyCompletionItems,
  companyCompletionPercent,
  justCreatedCompany,
  modeMarket,
  modeBuild,
  savingUsage,
  onOpenEditProfile,
  onSelectPersonMode,
  onSelectCompanyMode,
  onOpenPersonCompanyCard,
  onOpenMarket,
  onOpenListingModal,
  onOpenSupplierMap,
  onOpenMarketAuctions,
  onOpenProfileAssistant,
  onPressBuildCard,
  onOpenEditCompany,
  onSignOut,
  onToggleMarket,
  onOpenCompanyCabinet,
  onOpenCompanyCabinetFromBanner,
  onOpenInviteModal,
  onOpenSupplierShowcase,
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

  const companyCompletionBarStyle = useMemo<ViewStyle>(
    () => ({
      width: `${companyCompletionPercent}%`,
    }),
    [companyCompletionPercent],
  );

  return (
    <ScrollView
      style={styles.scrollFill}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.profileHeaderCard}>
        <Pressable
          onPress={onOpenEditProfile}
          style={styles.profileHeaderAvatarWrap}
        >
          <View
            style={[
              styles.profileHeaderAvatar,
              profileHeaderAvatarToneStyle,
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
            profileHeaderRoleBadgeStyle,
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
          onPress={onOpenEditProfile}
        >
          <Text style={styles.profileEditButtonText}>Редактировать</Text>
        </Pressable>
      </View>

      <View style={styles.modeSwitchRow}>
        <Pressable
          testID="profile-mode-person"
          style={[
            styles.modeSwitchBtn,
            profileMode === "person" && styles.modeSwitchBtnActive,
          ]}
          onPress={onSelectPersonMode}
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
          testID="profile-mode-company"
          style={[
            styles.modeSwitchBtn,
            profileMode === "company" && styles.modeSwitchBtnActive,
          ]}
          onPress={onSelectCompanyMode}
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
            profilePhone={profile.phone?.trim() || "Не указан"}
            profileEmail={profileEmail || "Не указан"}
            profileCity={profile.city?.trim() || company?.city?.trim() || "Не указан"}
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
            requisitesContact={
              company?.phone_main?.trim() || profile.phone?.trim() || "Не указан"
            }
            onOpenEditProfile={onOpenEditProfile}
            onOpenCompanyCard={onOpenPersonCompanyCard}
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
                onPress={onOpenEditProfile}
              />
              <MenuActionRow
                icon="storefront-outline"
                title="Маркет и витрина"
                subtitle="Откройте маркет, витрину поставщика и текущие объявления."
                onPress={onOpenMarket}
              />
              <MenuActionRow
                testID="profile-listing-open"
                accessibilityLabel="profile_listing_open"
                icon="add-circle-outline"
                title="Добавить объявление"
                subtitle="Откройте текущую форму публикации товара или услуги."
                onPress={onOpenListingModal}
              />
              <MenuActionRow
                icon="map-outline"
                title="Карта спроса и поставщиков"
                subtitle="Поставщики, спрос и география позиций на карте."
                onPress={onOpenSupplierMap}
              />
              <MenuActionRow
                icon="hammer-outline"
                title="Торги"
                subtitle="Актуальные торги, позиции и переход к деталям."
                onPress={onOpenMarketAuctions}
              />
              <MenuActionRow
                icon="sparkles-outline"
                title="AI ассистент"
                subtitle="Контекстный помощник по профилю, витрине и модулям."
                onPress={onOpenProfileAssistant}
              />
              <MenuActionRow
                icon="business-outline"
                title={company ? "Редактировать компанию" : "Создать компанию"}
                subtitle={
                  company
                    ? "Откройте текущую форму редактирования компании."
                    : "Подключите кабинет компании без смены действующей логики."
                }
                onPress={company ? onOpenEditCompany : onPressBuildCard}
              />
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
                onPress={onToggleMarket}
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
                onPress={onPressBuildCard}
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
                <View style={styles.flexOne}>
                  <Text style={styles.completionTitle}>Готовность кабинета компании</Text>
                  <Text style={styles.completionSubtitle}>
                    Чем полнее карточка компании, тем чище работают реквизиты,
                    команда и витрина поставщика.
                  </Text>
                </View>
                <Text style={styles.completionPercent}>{companyCompletionPercent}%</Text>
              </View>
              <View style={styles.completionBarTrack}>
                <View
                  style={[
                    styles.completionBarFill,
                    companyCompletionBarStyle,
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
                testID="profile-company-completion-action"
                style={styles.completionAction}
                onPress={company ? onOpenEditCompany : onOpenCompanyCabinet}
              >
                <Text style={styles.completionActionText}>
                  {company ? "Заполнить компанию" : "Создать кабинет компании"}
                </Text>
              </Pressable>
            </View>
          </View>

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

                    <View style={styles.companyActionsRow}>
                      <Pressable
                        testID="profile-company-open-cabinet"
                        style={styles.companyBtn}
                        onPress={onOpenCompanyCabinetFromBanner}
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
                        onPress={onOpenEditCompany}
                      >
                        <Text style={styles.companyBtnTextSecondary}>
                          Редактировать компанию
                        </Text>
                      </Pressable>

                      <Pressable
                        testID="profile-company-invite-open"
                        style={[
                          styles.companyBtn,
                          styles.companyBtnSecondary,
                        ]}
                        onPress={onOpenInviteModal}
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
                        savingUsage && styles.buttonDisabled,
                      ]}
                      onPress={onOpenCompanyCabinet}
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
                  onPress={onOpenEditCompany}
                >
                  <Text style={styles.companyBtnTextSecondary}>
                    Редактировать профиль компании
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Витрина поставщика</Text>
            <View style={styles.sectionCard}>
              {modeMarket ? (
                <>
                  <Text style={styles.companyTitle}>
                    Витрина товаров и материалов
                  </Text>
                  <Text style={styles.companyText}>
                    Управляйте своими объявлениями, открывайте витрину поставщика и
                    связывайте профиль с маркетом и картой.
                  </Text>

                  <Pressable
                    testID="profile-supplier-showcase-open"
                    style={styles.companyBtn}
                    onPress={onOpenSupplierShowcase}
                  >
                    <Text style={styles.companyBtnText}>
                      Открыть витрину поставщика
                    </Text>
                  </Pressable>
                  <View style={[styles.companyActionsRow, styles.companyActionsRowTop]}>
                    <Pressable
                      style={[styles.companyBtn, styles.companyBtnSecondary]}
                      onPress={onOpenMarket}
                    >
                      <Text style={styles.companyBtnTextSecondary}>
                        Открыть маркет
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.companyBtn, styles.companyBtnSecondary]}
                      onPress={onOpenMarketAuctions}
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
                      styles.companyActionsRowTop,
                    ]}
                    onPress={onOpenProfileAssistant}
                  >
                    <Text style={styles.companyBtnTextSecondary}>
                      Спросить AI по витрине и объявлениям
                    </Text>
                  </Pressable>

                  <Text style={[styles.chipHint, styles.chipHintSpaced]}>
                    {listingsSummary}. Используйте маркет и карту, чтобы управлять
                    спросом и видимостью объявлений.
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
                onPress={onOpenEditProfile}
              />
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
        </>
      )}

      <Text style={styles.profileFooterText}>GOX v1.0.0</Text>
    </ScrollView>
  );
}

export default ProfileMainSections;
