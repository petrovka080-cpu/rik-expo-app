import React from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import type { DeveloperOverrideRole } from "../../lib/developerOverride";
import type { OfficePostReturnSubtree } from "../../lib/navigation/officeReentryBreadcrumbs";
import { getProfileRoleLabel } from "../profile/profile.helpers";
import type { OfficeWorkspaceCard } from "./officeAccess.model";
import type {
  CreateCompanyDraft,
  OfficeAccessScreenData,
} from "./officeAccess.types";
import { DirectionCard } from "./officeHub.cards";
import { OfficeCompanyCreateSection } from "./officeHub.companyCreateSection";
import {
  COPY,
  type PostReturnSectionKey,
  type SectionKey,
} from "./officeHub.constants";
import { styles } from "./officeHub.styles";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

export { DirectionCard, InviteCard, MemberCard } from "./officeHub.cards";
export { OfficeCompanyCreateSection } from "./officeHub.companyCreateSection";
export {
  OfficeInviteModalSection,
  OfficeInvitesSection,
  OfficeMembersSection,
} from "./officeHub.collaborationSections";

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
  openInviteModal: (card: OfficeWorkspaceCard) => void;
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

const OFFICE_DIRECTION_SECTION_BY_KEY: Record<
  string,
  (props: OfficeDirectionSectionProps) => React.ReactElement
> = {
  accountant: AccountantOfficeSection,
  buyer: BuyerOfficeSection,
  contractor: ContractorOfficeSection,
  director: DirectorOfficeSection,
  engineer: EngineerOfficeSection,
  foreman: ForemanOfficeSection,
  reports: ReportsOfficeSection,
  security: SecurityOfficeSection,
  warehouse: WarehouseOfficeSection,
};

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
