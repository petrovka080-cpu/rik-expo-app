import React from "react";
import { Modal, Pressable, Text, TextInput, View, type LayoutChangeEvent } from "react-native";

import type { OfficePostReturnSubtree } from "../../lib/navigation/officeReentryBreadcrumbs";
import { getProfileRoleLabel } from "../profile/profile.helpers";
import type { OfficeAccessMember, OfficeAccessScreenData } from "./officeAccess.types";
import { InviteCard, MemberCard } from "./officeHub.cards";
import { COPY, type InviteFormDraft, type PostReturnSectionKey, type SectionKey } from "./officeHub.constants";
import { OfficeInviteHandoffSection } from "./officeHub.inviteHandoffSection";
import { styles } from "./officeHub.styles";
import type { OfficeInviteHandoff } from "./officeInviteShare";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

type LayoutHandler = ((event: LayoutChangeEvent) => void) | undefined;
type SectionLayout = (
  section: PostReturnSectionKey,
  offsetKey?: SectionKey,
) => LayoutHandler;
type SubtreeLayout = (subtree: OfficePostReturnSubtree) => LayoutHandler;
type RenderSubtreeBoundary = (
  subtree: OfficePostReturnSubtree,
  children: React.ReactNode,
) => React.ReactNode;

type OfficeHubSectionChrome = {
  onSectionLayout: SectionLayout;
  onSubtreeLayout: SubtreeLayout;
  renderSubtreeBoundary: RenderSubtreeBoundary;
};

type OfficeInviteFlowState = {
  closeInviteModal: () => void;
  handleCreateInvite: () => Promise<void>;
  handleCopyInvite: (value: string, feedback: string) => Promise<void>;
  handleOpenInviteChannel: (url: string) => Promise<void>;
  inviteCard: { inviteRole?: string | null } | null;
  inviteDraft: InviteFormDraft;
  inviteFeedback: string | null;
  inviteHandoff: OfficeInviteHandoff | null;
  inviteHandoffFeedback: string | null;
  savingInvite: boolean;
  setInviteDraft: React.Dispatch<React.SetStateAction<InviteFormDraft>>;
};

type OfficeMembersSectionState = {
  items: OfficeAccessMember[];
  savingRole: string | null;
  handleAssignRole: (memberUserId: string, nextRole: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  handleLoadMore: () => Promise<void>;
};

export function OfficeInvitesSection({
  access,
  data,
  invite,
  onSectionLayout,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: OfficeHubSectionChrome & {
  access: OfficeHubRoleAccessState;
  data: Pick<OfficeAccessScreenData, "invites">;
  invite: Pick<
    OfficeInviteFlowState,
    | "handleCopyInvite"
    | "handleOpenInviteChannel"
    | "inviteFeedback"
    | "inviteHandoff"
    | "inviteHandoffFeedback"
  >;
}) {
  if (!access.shouldRenderCompanyPostReturnSection("invites")) return null;

  const inviteHandoff = invite.inviteHandoff;

  return (
    <View
      testID="office-section-invites"
      style={styles.section}
      onLayout={onSectionLayout("invites", "invites")}
    >
      <Text style={styles.sectionTitle}>{COPY.invitesTitle}</Text>
      {invite.inviteFeedback ? (
        <View style={styles.notice}>
          <Text testID="office-invite-feedback" style={styles.noticeText}>
            {invite.inviteFeedback}
          </Text>
        </View>
      ) : null}
      {inviteHandoff
        ? renderSubtreeBoundary(
            "invites_handoff",
            <OfficeInviteHandoffSection
              handoff={inviteHandoff}
              feedback={invite.inviteHandoffFeedback}
              onCopyInvite={invite.handleCopyInvite}
              onOpenInviteChannel={invite.handleOpenInviteChannel}
              onLayout={onSubtreeLayout("invites_handoff")}
            />,
          )
        : null}
      {!access.canManageCompany ? (
        <View style={styles.panel}>
          <Text style={styles.helper}>{COPY.invitesManageHint}</Text>
        </View>
      ) : null}
      {renderSubtreeBoundary(
        "invites_list",
        data.invites.length > 0 ? (
          <View style={styles.stack} onLayout={onSubtreeLayout("invites_list")}>
            {data.invites.map((inviteItem) => (
              <InviteCard key={inviteItem.id} invite={inviteItem} />
            ))}
          </View>
        ) : (
          <View style={styles.panel} onLayout={onSubtreeLayout("invites_list")}>
            <Text style={styles.helper}>{COPY.noInvites}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function OfficeMembersSection({
  access,
  members,
  onSectionLayout,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: OfficeHubSectionChrome & {
  access: OfficeHubRoleAccessState;
  members: OfficeMembersSectionState;
}) {
  if (!access.shouldRenderCompanyPostReturnSection("members")) return null;

  return (
    <View
      testID="office-section-members"
      style={styles.section}
      onLayout={onSectionLayout("members", "members")}
    >
      <Text style={styles.sectionTitle}>{COPY.membersTitle}</Text>
      {renderSubtreeBoundary(
        "members_list",
        members.items.length > 0 ? (
          <View style={styles.stack} onLayout={onSubtreeLayout("members_list")}>
            {members.items.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                canManage={access.canManageCompany}
                savingRole={members.savingRole}
                onAssignRole={members.handleAssignRole}
              />
            ))}
            {members.hasMore ? (
              <Pressable
                testID="office-members-load-more"
                disabled={members.loadingMore}
                onPress={() => void members.handleLoadMore()}
                style={[
                  styles.secondary,
                  styles.grow,
                  members.loadingMore && styles.dim,
                ]}
              >
                <Text style={styles.secondaryText}>
                  {members.loadingMore
                    ? COPY.membersLoadingMore
                    : COPY.membersLoadMore}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.panel} onLayout={onSubtreeLayout("members_list")}>
            <Text style={styles.helper}>{COPY.noMembers}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function OfficeInviteModalSection({
  invite,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: Pick<OfficeHubSectionChrome, "onSubtreeLayout" | "renderSubtreeBoundary"> & {
  invite: Pick<
    OfficeInviteFlowState,
    | "closeInviteModal"
    | "handleCreateInvite"
    | "inviteCard"
    | "inviteDraft"
    | "savingInvite"
    | "setInviteDraft"
  >;
}) {
  if (!invite.inviteCard) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() => invite.closeInviteModal()}
    >
      <View style={styles.modalWrap}>
        <Pressable
          style={styles.backdrop}
          onPress={() => invite.closeInviteModal()}
        />
        {renderSubtreeBoundary(
          "invite_modal_form",
          <View
            testID="office-role-invite-modal"
            style={styles.sheet}
            onLayout={onSubtreeLayout("invite_modal_form")}
          >
            <Text style={styles.eyebrow}>{COPY.inviteModalTitle}</Text>
            <Text testID="office-role-invite-role" style={styles.sheetTitle}>
              {invite.inviteCard.inviteRole
                ? getProfileRoleLabel(invite.inviteCard.inviteRole)
                : COPY.noRole}
            </Text>
            <Text style={styles.helper}>{COPY.inviteModalLead}</Text>
            <View style={styles.stack}>
              <Text style={styles.label}>ФИО сотрудника</Text>
              <TextInput
                testID="office-invite-name"
                placeholder="ФИО сотрудника"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={invite.inviteDraft.name}
                onChangeText={(value) =>
                  invite.setInviteDraft((current) => ({ ...current, name: value }))
                }
              />
            </View>
            <View style={styles.stack}>
              <Text style={styles.label}>Телефон</Text>
              <TextInput
                testID="office-invite-phone"
                placeholder="Телефон"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="phone-pad"
                value={invite.inviteDraft.phone}
                onChangeText={(value) =>
                  invite.setInviteDraft((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
              />
            </View>
            <View style={styles.stack}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="office-invite-email"
                placeholder="Email (необязательно)"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={invite.inviteDraft.email}
                onChangeText={(value) =>
                  invite.setInviteDraft((current) => ({
                    ...current,
                    email: value,
                  }))
                }
              />
            </View>
            <View style={styles.stack}>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                testID="office-invite-comment"
                placeholder="Комментарий (необязательно)"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.textArea]}
                multiline
                value={invite.inviteDraft.comment}
                onChangeText={(value) =>
                  invite.setInviteDraft((current) => ({
                    ...current,
                    comment: value,
                  }))
                }
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => invite.closeInviteModal()}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{COPY.cancel}</Text>
              </Pressable>
              <Pressable
                testID="office-create-invite"
                disabled={invite.savingInvite}
                onPress={() => void invite.handleCreateInvite()}
                style={[
                  styles.primary,
                  styles.grow,
                  invite.savingInvite && styles.dim,
                ]}
              >
                <Text style={styles.primaryText}>{COPY.inviteCta}</Text>
              </Pressable>
            </View>
          </View>,
        )}
      </View>
    </Modal>
  );
}
