import React from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";

import type { DeveloperOverrideRole } from "../../lib/developerOverride";
import type { OfficePostReturnSubtree } from "../../lib/navigation/officeReentryBreadcrumbs";
import { getProfileRoleLabel } from "../profile/profile.helpers";
import type { OfficeWorkspaceCard } from "./officeAccess.model";
import type {
  CreateCompanyDraft,
  OfficeAccessMember,
  OfficeAccessScreenData,
} from "./officeAccess.types";
import { DirectionCard, InviteCard, MemberCard } from "./officeHub.cards";
import { OfficeCompanyCreateSection } from "./officeHub.companyCreateSection";
import {
  COPY,
  type InviteFormDraft,
  type PostReturnSectionKey,
  type SectionKey,
} from "./officeHub.constants";
import { styles } from "./officeHub.styles";
import type { OfficeInviteHandoff } from "./officeInviteShare";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

export { DirectionCard, InviteCard, MemberCard } from "./officeHub.cards";
export { OfficeCompanyCreateSection } from "./officeHub.companyCreateSection";

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

type OfficeCompanySectionState = {
  companyDraft: CreateCompanyDraft;
  savingCompany: boolean;
  setCompanyDraft: React.Dispatch<React.SetStateAction<CreateCompanyDraft>>;
  handleCreateCompany: () => Promise<void>;
  handleEditCompany: () => void;
};

type OfficeInviteFlowState = {
  closeInviteModal: () => void;
  handleCreateInvite: () => Promise<void>;
  handleCopyInvite: (value: string, feedback: string) => Promise<void>;
  handleOpenInviteChannel: (url: string) => Promise<void>;
  inviteCard: OfficeWorkspaceCard | null;
  inviteDraft: InviteFormDraft;
  inviteFeedback: string | null;
  inviteHandoff: OfficeInviteHandoff | null;
  inviteHandoffFeedback: string | null;
  openInviteModal: (card: OfficeWorkspaceCard) => void;
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

type OfficeHubSectionChrome = {
  onSectionLayout: SectionLayout;
  onSubtreeLayout: SubtreeLayout;
  renderSubtreeBoundary: RenderSubtreeBoundary;
};

type OfficeDirectionSectionProps = {
  canInvite: boolean;
  card: OfficeWorkspaceCard;
  onInvite: (card: OfficeWorkspaceCard) => void;
  onOpen: (card: OfficeWorkspaceCard) => void;
};

function OfficeDirectionSectionCard({
  canInvite,
  card,
  onInvite,
  onOpen,
}: OfficeDirectionSectionProps) {
  return (
    <DirectionCard
      card={card}
      canInvite={canInvite}
      onOpen={() => onOpen(card)}
      onInvite={() => onInvite(card)}
    />
  );
}

export function DirectorOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function ForemanOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function BuyerOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function AccountantOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function WarehouseOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function ContractorOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function SecurityOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function EngineerOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

export function ReportsOfficeSection(props: OfficeDirectionSectionProps) {
  return <OfficeDirectionSectionCard {...props} />;
}

const OFFICE_DIRECTION_SECTION_BY_KEY = {
  accountant: AccountantOfficeSection,
  buyer: BuyerOfficeSection,
  contractor: ContractorOfficeSection,
  director: DirectorOfficeSection,
  engineer: EngineerOfficeSection,
  foreman: ForemanOfficeSection,
  reports: ReportsOfficeSection,
  security: SecurityOfficeSection,
  warehouse: WarehouseOfficeSection,
} satisfies Record<
  string,
  (props: OfficeDirectionSectionProps) => React.ReactElement
>;

function renderOfficeDirectionSection(props: OfficeDirectionSectionProps) {
  const Section =
    OFFICE_DIRECTION_SECTION_BY_KEY[props.card.key] ?? OfficeDirectionSectionCard;
  return <Section key={props.card.key} {...props} />;
}

export function OfficeDeveloperOverrideSection({
  activeEffectiveRole,
  developerRoleSaving,
  roles,
  onClear,
  onSelectRole,
}: {
  activeEffectiveRole?: string | null;
  developerRoleSaving: string | null;
  roles: readonly DeveloperOverrideRole[];
  onClear: () => void;
  onSelectRole: (role: DeveloperOverrideRole) => void;
}) {
  return (
    <View testID="developer-override-panel" style={styles.devPanel}>
      <View style={styles.inline}>
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>Dev override</Text>
          <Text style={styles.helper}>
            Active role: {activeEffectiveRole ?? "normal"}
          </Text>
        </View>
        <Pressable
          testID="developer-override-clear"
          disabled={Boolean(developerRoleSaving)}
          onPress={onClear}
          style={({ pressed }) => [
            styles.secondary,
            styles.devRoleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryText}>Normal</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {roles.map((role) => {
          const active = activeEffectiveRole === role;
          return (
            <Pressable
              key={role}
              testID={`developer-override-role-${role}`}
              disabled={Boolean(developerRoleSaving) || active}
              onPress={() => onSelectRole(role)}
              style={[
                styles.chip,
                active && styles.chipActive,
                styles.devRoleButton,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {getProfileRoleLabel(role)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function OfficeCompanySummarySection({
  access,
  company,
  companySection,
  onSectionLayout,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: OfficeHubSectionChrome & {
  access: OfficeHubRoleAccessState;
  company: NonNullable<OfficeAccessScreenData["company"]>;
  companySection: Pick<OfficeCompanySectionState, "handleEditCompany">;
}) {
  if (!access.shouldRenderCompanyPostReturnSection("summary")) return null;

  return (
    <View
      testID="office-summary"
      style={styles.summary}
      onLayout={onSectionLayout("summary")}
    >
      {renderSubtreeBoundary(
        "summary_header",
        <View
          style={styles.summaryHeader}
          onLayout={onSubtreeLayout("summary_header")}
        >
          <Text style={styles.eyebrow}>{COPY.summaryTitle}</Text>
          <Pressable
            testID="office-company-edit"
            onPress={companySection.handleEditCompany}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
            accessibilityLabel={COPY.summaryEdit}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </Pressable>
        </View>,
      )}
      <Text style={styles.company}>{company.name}</Text>
      {access.summaryMeta
        ? renderSubtreeBoundary(
            "summary_meta",
            <Text
              style={styles.summaryMeta}
              onLayout={onSubtreeLayout("summary_meta")}
            >
              {access.summaryMeta}
            </Text>,
          )
        : null}
      {renderSubtreeBoundary(
        "summary_badges",
        <View
          style={styles.summaryBadges}
          onLayout={onSubtreeLayout("summary_badges")}
        >
          {access.visibleRoleLabel ? (
            <View style={[styles.summaryBadge, styles.summaryBadgeRole]}>
              <Text style={styles.summaryBadgeText}>
                {access.visibleRoleLabel}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.summaryBadge,
              access.accessStatus.tone === "success" &&
                styles.summaryBadgeSuccess,
              access.accessStatus.tone === "warning" &&
                styles.summaryBadgeWarning,
            ]}
          >
            <Text
              style={[
                styles.summaryBadgeText,
                access.accessStatus.tone === "success" &&
                  styles.summaryBadgeTextSuccess,
                access.accessStatus.tone === "warning" &&
                  styles.summaryBadgeTextWarning,
              ]}
            >
              {access.accessStatus.label}
            </Text>
          </View>
        </View>,
      )}
    </View>
  );
}

export function OfficeRoleDirectionsSection({
  access,
  invite,
  onOpenCard,
  onSectionLayout,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: OfficeHubSectionChrome & {
  access: OfficeHubRoleAccessState;
  invite: Pick<OfficeInviteFlowState, "openInviteModal">;
  onOpenCard: (card: OfficeWorkspaceCard) => void;
}) {
  if (!access.shouldRenderCompanyPostReturnSection("directions")) return null;

  return (
    <View
      testID="office-section-directions"
      style={styles.section}
      onLayout={onSectionLayout("directions")}
    >
      <Text style={styles.sectionTitle}>{COPY.directionsTitle}</Text>
      {renderSubtreeBoundary(
        "directions_cards",
        access.officeCards.length > 0 ? (
          <View
            style={styles.grid}
            onLayout={onSubtreeLayout("directions_cards")}
          >
            {access.officeCards.map((card) =>
              renderOfficeDirectionSection({
                card,
                canInvite: access.canManageCompany,
                onOpen: onOpenCard,
                onInvite: invite.openInviteModal,
              }),
            )}
          </View>
        ) : (
          <View
            style={styles.panel}
            onLayout={onSubtreeLayout("directions_cards")}
          >
            <Text style={styles.helper}>{COPY.noDirections}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function OfficeCompanyDetailsSection({
  access,
  onSectionLayout,
  onSubtreeLayout,
  renderSubtreeBoundary,
}: OfficeHubSectionChrome & {
  access: OfficeHubRoleAccessState;
}) {
  if (
    !access.shouldRenderCompanyPostReturnSection("company_details") ||
    access.visibleCompanyDetails.length === 0
  ) {
    return null;
  }

  return (
    <View
      testID="office-section-company-details"
      style={styles.section}
      onLayout={onSectionLayout("company_details", "company")}
    >
      <Text style={styles.sectionTitle}>{COPY.companyDetailsTitle}</Text>
      {renderSubtreeBoundary(
        "company_details_rows",
        <View
          style={styles.panel}
          onLayout={onSubtreeLayout("company_details_rows")}
        >
          {access.visibleCompanyDetails.map((item, index) => (
            <View
              key={item.label}
              style={
                index === access.visibleCompanyDetails.length - 1
                  ? styles.rowLast
                  : styles.row
              }
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>,
      )}
    </View>
  );
}

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
            <View
              testID="office-invite-handoff"
              style={styles.handoff}
              onLayout={onSubtreeLayout("invites_handoff")}
            >
              <Text style={styles.eyebrow}>{COPY.inviteHandoffTitle}</Text>
              <Text testID="office-invite-handoff-role" style={styles.handoffTitle}>
                {inviteHandoff.roleLabel}
              </Text>
              <Text style={styles.helper}>{COPY.inviteHandoffLead}</Text>
              <View style={styles.panel}>
                <View style={styles.row}>
                  <Text style={styles.label}>{COPY.summaryTitle}</Text>
                  <Text testID="office-invite-handoff-company" style={styles.value}>
                    {inviteHandoff.companyName}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{COPY.summaryRole}</Text>
                  <Text style={styles.value}>{inviteHandoff.roleLabel}</Text>
                </View>
                <View style={styles.handoffCodeBlock}>
                  <Text style={styles.label}>Код</Text>
                  <Text testID="office-invite-handoff-code" style={styles.handoffCode}>
                    {inviteHandoff.inviteCode}
                  </Text>
                </View>
                <View style={styles.rowLast}>
                  <Text style={styles.label}>{COPY.inviteHandoffInstruction}</Text>
                  <Text style={styles.value}>
                    {inviteHandoff.instruction}
                  </Text>
                </View>
              </View>
              {invite.inviteHandoffFeedback ? (
                <View style={styles.noticeSoft}>
                  <Text
                    testID="office-invite-handoff-feedback"
                    style={styles.noticeSoftText}
                  >
                    {invite.inviteHandoffFeedback}
                  </Text>
                </View>
              ) : null}
              <View style={styles.actionGrid}>
                <Pressable
                  testID="office-invite-copy-code"
                  onPress={() =>
                    void invite.handleCopyInvite(
                      inviteHandoff.inviteCode,
                      COPY.inviteCodeCopied,
                    )
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
                    void invite.handleCopyInvite(
                      inviteHandoff.message,
                      COPY.inviteMessageCopied,
                    )
                  }
                  style={[styles.secondary, styles.actionButton]}
                >
                  <Text style={[styles.secondaryText, styles.actionButtonText]}>
                    {COPY.inviteCopyMessage}
                  </Text>
                </Pressable>
                <Pressable
                  testID="office-invite-open-whatsapp"
                  onPress={() =>
                    void invite.handleOpenInviteChannel(
                      inviteHandoff.whatsappUrl,
                    )
                  }
                  style={[styles.secondary, styles.actionButton]}
                >
                  <Text style={[styles.secondaryText, styles.actionButtonText]}>
                    {COPY.inviteOpenWhatsapp}
                  </Text>
                </Pressable>
                <Pressable
                  testID="office-invite-open-telegram"
                  onPress={() =>
                    void invite.handleOpenInviteChannel(
                      inviteHandoff.telegramUrl,
                    )
                  }
                  style={[styles.secondary, styles.actionButton]}
                >
                  <Text style={[styles.secondaryText, styles.actionButtonText]}>
                    {COPY.inviteOpenTelegram}
                  </Text>
                </Pressable>
                <Pressable
                  testID="office-invite-open-email"
                  onPress={() =>
                    void invite.handleOpenInviteChannel(inviteHandoff.emailUrl)
                  }
                  style={[styles.secondary, styles.actionButton]}
                >
                  <Text style={[styles.secondaryText, styles.actionButtonText]}>
                    {COPY.inviteOpenEmail}
                  </Text>
                </Pressable>
              </View>
            </View>,
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

export function OfficeHubCompanyCreateRootSection({
  company,
  onSectionLayout,
}: {
  company: Pick<
    OfficeCompanySectionState,
    | "companyDraft"
    | "handleCreateCompany"
    | "savingCompany"
    | "setCompanyDraft"
  >;
  onSectionLayout: SectionLayout;
}) {
  return (
    <OfficeCompanyCreateSection
      companyDraft={company.companyDraft}
      savingCompany={company.savingCompany}
      onChangeCompanyDraft={company.setCompanyDraft}
      onCreateCompany={() => void company.handleCreateCompany()}
      onCompanyCreateLayout={onSectionLayout("company_create", "company")}
      onRulesLayout={onSectionLayout("rules")}
    />
  );
}
