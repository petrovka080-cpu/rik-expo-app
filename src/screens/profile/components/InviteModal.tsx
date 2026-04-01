import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { profileStyles } from "../profile.styles";
import { LabeledInput } from "./ProfilePrimitives";

const styles = profileStyles;

const INVITE_ROLE_OPTIONS = [
  { code: "foreman", label: "Прораб" },
  { code: "buyer", label: "Снабженец" },
  { code: "accountant", label: "Бухгалтер" },
  { code: "engineer", label: "Инженер / мастер" },
  { code: "warehouse", label: "Склад" },
  { code: "contractor", label: "Подрядчик" },
  { code: "supplier", label: "Поставщик" },
];

type InviteModalProps = {
  visible: boolean;
  savingInvite: boolean;
  inviteRole: string;
  inviteName: string;
  invitePhone: string;
  inviteEmail: string;
  inviteComment: string;
  lastInviteCode: string | null;
  onRequestClose: () => void;
  onChangeInviteRole: (value: string) => void;
  onChangeInviteName: (value: string) => void;
  onChangeInvitePhone: (value: string) => void;
  onChangeInviteEmail: (value: string) => void;
  onChangeInviteComment: (value: string) => void;
  onSubmitInvite: () => void;
  onInviteAnother: () => void;
  onInviteDone: () => void;
  onCopyInviteCode: () => void;
  onShareInviteWhatsApp: () => void;
  onShareInviteTelegram: () => void;
};

export function InviteModal({
  visible,
  savingInvite,
  inviteRole,
  inviteName,
  invitePhone,
  inviteEmail,
  inviteComment,
  lastInviteCode,
  onRequestClose,
  onChangeInviteRole,
  onChangeInviteName,
  onChangeInvitePhone,
  onChangeInviteEmail,
  onChangeInviteComment,
  onSubmitInvite,
  onInviteAnother,
  onInviteDone,
  onCopyInviteCode,
  onShareInviteWhatsApp,
  onShareInviteTelegram,
}: InviteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.compactModalCard]}>
          {!lastInviteCode && (
            <>
              <Text style={styles.modalTitle}>Пригласить сотрудников</Text>
              <Text style={styles.modalSub}>
                Добавьте ключевые роли в вашей компании. Укажите номер телефона
                сотрудника, который использует WhatsApp / Telegram, и при
                необходимости email — мы сгенерируем код приглашения.
              </Text>

              <Text style={styles.modalLabel}>Роль</Text>
              <View style={styles.roleChipRow}>
                {INVITE_ROLE_OPTIONS.map((roleOption) => (
                  <Pressable
                    key={roleOption.code}
                    onPress={() => onChangeInviteRole(roleOption.code)}
                    style={[
                      styles.roleChip,
                      inviteRole === roleOption.code && styles.roleChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        inviteRole === roleOption.code &&
                          styles.roleChipTextActive,
                      ]}
                    >
                      {roleOption.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView
                style={styles.modalScrollInvite}
                contentContainerStyle={styles.modalScrollContent}
              >
                <LabeledInput
                  label="Имя сотрудника"
                  value={inviteName}
                  onChangeText={onChangeInviteName}
                  placeholder="Например: Азиз"
                />

                <LabeledInput
                  label="Телефон сотрудника (WhatsApp / Telegram)"
                  value={invitePhone}
                  onChangeText={onChangeInvitePhone}
                  placeholder="+996…"
                  keyboardType="phone-pad"
                />

                <LabeledInput
                  label="Email сотрудника"
                  value={inviteEmail}
                  onChangeText={onChangeInviteEmail}
                  placeholder="worker@example.com"
                  keyboardType="email-address"
                />

                <LabeledInput
                  label="Комментарий"
                  value={inviteComment}
                  onChangeText={onChangeInviteComment}
                  placeholder="Например: ведёт объект в Оше"
                  multiline
                  big
                />
              </ScrollView>

              <View style={styles.modalButtonsRow}>
                <Pressable
                  testID="profile-invite-modal-cancel"
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={onRequestClose}
                  disabled={savingInvite}
                >
                  <Text style={styles.modalBtnSecondaryText}>Позже</Text>
                </Pressable>

                <Pressable
                  testID="profile-invite-modal-submit"
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={onSubmitInvite}
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
                Отправьте этот код сотруднику в WhatsApp / Telegram. Он введёт
                его в приложении и попадёт в ваш кабинет компании.
              </Text>

              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteCodeLabel}>Код приглашения</Text>
                <Text style={styles.inviteCodeValue}>{lastInviteCode}</Text>
                <Text style={styles.inviteCodeHint}>Действителен 14 дней</Text>
              </View>

              <View style={styles.modalButtonsRow}>
                <Pressable
                  testID="profile-invite-modal-again"
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={onInviteAnother}
                >
                  <Text style={styles.modalBtnSecondaryText}>
                    Пригласить ещё
                  </Text>
                </Pressable>
                <Pressable
                  testID="profile-invite-modal-done"
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={onInviteDone}
                >
                  <Text style={styles.modalBtnPrimaryText}>Готово</Text>
                </Pressable>
              </View>

              <View style={styles.shareRow}>
                <Pressable
                  testID="profile-invite-modal-copy"
                  style={[styles.shareBtn, styles.shareBtnSecondary]}
                  onPress={onCopyInviteCode}
                >
                  <Text style={styles.shareBtnSecondaryText}>
                    Скопировать код
                  </Text>
                </Pressable>

                <Pressable
                  testID="profile-invite-modal-whatsapp"
                  style={[styles.shareBtn, styles.shareBtnPrimary]}
                  onPress={onShareInviteWhatsApp}
                >
                  <Text style={styles.shareBtnPrimaryText}>
                    Отправить в WhatsApp
                  </Text>
                </Pressable>
              </View>

              <View style={styles.shareRow}>
                <Pressable
                  testID="profile-invite-modal-telegram"
                  style={[styles.shareBtn, styles.shareBtnPrimary]}
                  onPress={onShareInviteTelegram}
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
  );
}

export default InviteModal;
