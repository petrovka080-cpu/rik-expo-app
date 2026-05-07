import React from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { COPY } from "./officeHub.constants";
import { styles } from "./officeHub.styles";
import type { OfficeInviteHandoff } from "./officeInviteShare";

type OfficeInviteHandoffSectionProps = {
  feedback: string | null;
  handoff: OfficeInviteHandoff;
  onCopyInvite: (value: string, feedback: string) => Promise<void>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onOpenInviteChannel: (url: string) => Promise<void>;
};

export function OfficeInviteHandoffSection({
  feedback,
  handoff,
  onCopyInvite,
  onLayout,
  onOpenInviteChannel,
}: OfficeInviteHandoffSectionProps) {
  return (
    <View
      testID="office-invite-handoff"
      style={styles.handoff}
      onLayout={onLayout}
    >
      <Text style={styles.eyebrow}>{COPY.inviteHandoffTitle}</Text>
      <Text testID="office-invite-handoff-role" style={styles.handoffTitle}>
        {handoff.roleLabel}
      </Text>
      <Text style={styles.helper}>{COPY.inviteHandoffLead}</Text>
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>{COPY.summaryTitle}</Text>
          <Text testID="office-invite-handoff-company" style={styles.value}>
            {handoff.companyName}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{COPY.summaryRole}</Text>
          <Text style={styles.value}>{handoff.roleLabel}</Text>
        </View>
        <View style={styles.handoffCodeBlock}>
          <Text style={styles.label}>Код</Text>
          <Text testID="office-invite-handoff-code" style={styles.handoffCode}>
            {handoff.inviteCode}
          </Text>
        </View>
        <View style={styles.rowLast}>
          <Text style={styles.label}>{COPY.inviteHandoffInstruction}</Text>
          <Text style={styles.value}>{handoff.instruction}</Text>
        </View>
      </View>
      {feedback ? (
        <View style={styles.noticeSoft}>
          <Text
            testID="office-invite-handoff-feedback"
            style={styles.noticeSoftText}
          >
            {feedback}
          </Text>
        </View>
      ) : null}
      <View style={styles.actionGrid}>
        <Pressable
          testID="office-invite-copy-code"
          onPress={() =>
            void onCopyInvite(handoff.inviteCode, COPY.inviteCodeCopied)
          }
          style={[styles.secondary, styles.actionButton]}
        >
          <Text style={[styles.secondaryText, styles.actionButtonText]}>
            {COPY.inviteCopyCode}
          </Text>
        </Pressable>
        <Pressable
          testID="office-invite-copy-message"
          onPress={() =>
            void onCopyInvite(handoff.message, COPY.inviteMessageCopied)
          }
          style={[styles.secondary, styles.actionButton]}
        >
          <Text style={[styles.secondaryText, styles.actionButtonText]}>
            {COPY.inviteCopyMessage}
          </Text>
        </Pressable>
        <Pressable
          testID="office-invite-open-whatsapp"
          onPress={() => void onOpenInviteChannel(handoff.whatsappUrl)}
          style={[styles.secondary, styles.actionButton]}
        >
          <Text style={[styles.secondaryText, styles.actionButtonText]}>
            {COPY.inviteOpenWhatsapp}
          </Text>
        </Pressable>
        <Pressable
          testID="office-invite-open-telegram"
          onPress={() => void onOpenInviteChannel(handoff.telegramUrl)}
          style={[styles.secondary, styles.actionButton]}
        >
          <Text style={[styles.secondaryText, styles.actionButtonText]}>
            {COPY.inviteOpenTelegram}
          </Text>
        </Pressable>
        <Pressable
          testID="office-invite-open-email"
          onPress={() => void onOpenInviteChannel(handoff.emailUrl)}
          style={[styles.secondary, styles.actionButton]}
        >
          <Text style={[styles.secondaryText, styles.actionButtonText]}>
            {COPY.inviteOpenEmail}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
