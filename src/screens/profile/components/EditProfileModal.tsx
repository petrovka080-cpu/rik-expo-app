import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { profileStyles } from "../profile.styles";
import type { ProfileFormState } from "../profile.types";
import { LabeledInput } from "./ProfilePrimitives";

const styles = profileStyles;

type EditProfileModalProps = {
  visible: boolean;
  avatarLetter: string;
  profileAvatarDraft: string | null;
  profileForm: ProfileFormState;
  savingProfile: boolean;
  onRequestClose: () => void;
  onPickProfileAvatar: () => void;
  onSave: () => void;
  onChangeProfileName: (value: string) => void;
  onChangeProfilePhone: (value: string) => void;
  onChangeProfileCity: (value: string) => void;
  onChangeProfileBio: (value: string) => void;
  onChangeProfilePosition: (value: string) => void;
  onChangeProfileTelegram: (value: string) => void;
  onChangeProfileWhatsapp: (value: string) => void;
};

export function EditProfileModal({
  visible,
  avatarLetter,
  profileAvatarDraft,
  profileForm,
  savingProfile,
  onRequestClose,
  onPickProfileAvatar,
  onSave,
  onChangeProfileName,
  onChangeProfilePhone,
  onChangeProfileCity,
  onChangeProfileBio,
  onChangeProfilePosition,
  onChangeProfileTelegram,
  onChangeProfileWhatsapp,
}: EditProfileModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.modalTallCard]}>
          <Text style={styles.modalTitle}>Редактировать профиль</Text>
          <Text style={styles.modalSub}>
            Эти данные используются для личного аккаунта и объявлений.
          </Text>

          <ScrollView
            style={styles.modalScrollTall}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.profileAvatarEditor}>
              <Pressable
                style={styles.profileAvatarEditorPreview}
                onPress={onPickProfileAvatar}
              >
                {profileAvatarDraft ? (
                  <Image
                    source={{ uri: profileAvatarDraft }}
                    style={styles.profileAvatarEditorImage}
                  />
                ) : (
                  <Text style={styles.profileAvatarEditorInitial}>
                    {avatarLetter}
                  </Text>
                )}
              </Pressable>

              <View style={styles.profileAvatarEditorMeta}>
                <Text style={styles.profileAvatarEditorTitle}>Фото профиля</Text>
                <Text style={styles.profileAvatarEditorText}>
                  Аватар показывается в вашем профиле и связанных экранах.
                </Text>
                <Pressable
                  style={styles.profileAvatarEditorButton}
                  onPress={onPickProfileAvatar}
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
              value={profileForm.profileNameInput}
              onChangeText={onChangeProfileName}
              placeholder="Ваше имя или название"
            />

            <LabeledInput
              label="Телефон"
              value={profileForm.profilePhoneInput}
              onChangeText={onChangeProfilePhone}
              placeholder="+996..."
              keyboardType="phone-pad"
            />

            <LabeledInput
              label="Город"
              value={profileForm.profileCityInput}
              onChangeText={onChangeProfileCity}
              placeholder="Бишкек"
            />

            <LabeledInput
              label="О себе"
              value={profileForm.profileBioInput}
              onChangeText={onChangeProfileBio}
              placeholder="Коротко о вашем опыте и специализации"
              multiline
              big
            />

            <LabeledInput
              label="Должность / роль"
              value={profileForm.profilePositionInput}
              onChangeText={onChangeProfilePosition}
              placeholder="Директор, снабженец, прораб..."
            />

            <View style={styles.modalFieldRow}>
              <View style={styles.modalFieldCell}>
                <LabeledInput
                  label="Telegram"
                  value={profileForm.profileTelegramInput}
                  onChangeText={onChangeProfileTelegram}
                  placeholder="@gox_build"
                />
              </View>
              <View style={styles.modalFieldCell}>
                <LabeledInput
                  label="WhatsApp"
                  value={profileForm.profileWhatsappInput}
                  onChangeText={onChangeProfileWhatsapp}
                  placeholder="+996..."
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtonsRow}>
            <Pressable
              testID="profile-edit-modal-cancel"
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={onRequestClose}
              disabled={savingProfile}
            >
              <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable
              testID="profile-edit-modal-save"
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={onSave}
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
  );
}

export default EditProfileModal;
