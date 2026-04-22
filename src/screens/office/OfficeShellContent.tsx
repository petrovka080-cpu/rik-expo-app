import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
} from "react-native";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import type { DeveloperOverrideRole } from "../../lib/developerOverride";
import type { OfficePostReturnSubtree } from "../../lib/navigation/officeReentryBreadcrumbs";
import type { OfficeWorkspaceCard } from "./officeAccess.model";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { OfficeShellContentModel } from "./office.layout.model";
import {
  type SectionKey,
  type PostReturnSectionKey,
} from "./officeHub.constants";
import {
  OfficeCompanyDetailsSection,
  OfficeCompanySummarySection,
  OfficeDeveloperOverrideSection,
  OfficeHubCompanyCreateRootSection,
  OfficeInviteModalSection,
  OfficeInvitesSection,
  OfficeMembersSection,
  OfficeRoleDirectionsSection,
} from "./officeHub.sections";
import { styles } from "./officeHub.styles";
import type { useOfficeCompanySection } from "./useOfficeCompanySection";
import type { useOfficeInviteFlow } from "./useOfficeInviteFlow";
import type { useOfficeMembersSection } from "./useOfficeMembersSection";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

type LayoutHandler = ((event: LayoutChangeEvent) => void) | undefined;
type SectionLayoutHandler = (
  section: PostReturnSectionKey,
  offsetKey?: SectionKey,
) => LayoutHandler;
type SubtreeLayoutHandler = (
  subtree: OfficePostReturnSubtree,
  callback?: string,
) => LayoutHandler;
type RenderSubtreeBoundary = (
  subtree: OfficePostReturnSubtree,
  children: React.ReactNode,
) => React.ReactNode;

type OfficeCompanySectionState = ReturnType<typeof useOfficeCompanySection>;
type OfficeInviteFlowState = ReturnType<typeof useOfficeInviteFlow>;
type OfficeMembersSectionState = ReturnType<typeof useOfficeMembersSection>;

type OfficeShellContentProps = {
  model: OfficeShellContentModel;
  data: OfficeAccessScreenData;
  access: OfficeHubRoleAccessState;
  company: OfficeCompanySectionState;
  invite: OfficeInviteFlowState;
  members: OfficeMembersSectionState;
  scrollRef: React.RefObject<ScrollView | null>;
  refreshing: boolean;
  developerRoleSaving: string | null;
  developerOverrideRoles: readonly DeveloperOverrideRole[];
  onRefresh: () => void;
  onOpenOfficeCard: (card: OfficeWorkspaceCard) => void;
  onDeveloperRoleSelect: (role: DeveloperOverrideRole) => void;
  onDeveloperRoleClear: () => void;
  onSectionLayout: SectionLayoutHandler;
  onSubtreeLayout: SubtreeLayoutHandler;
  onScrollLayout: LayoutHandler;
  onContentSizeChange: ScrollViewProps["onContentSizeChange"];
  renderSubtreeBoundary: RenderSubtreeBoundary;
};

export default function OfficeShellContent(props: OfficeShellContentProps) {
  const {
    model,
    data,
    access,
    company,
    invite,
    members,
    scrollRef,
    refreshing,
    developerRoleSaving,
    developerOverrideRoles,
    onRefresh,
    onOpenOfficeCard,
    onDeveloperRoleSelect,
    onDeveloperRoleClear,
    onSectionLayout,
    onSubtreeLayout,
    onScrollLayout,
    onContentSizeChange,
    renderSubtreeBoundary,
  } = props;

  if (model.kind === "loading") {
    return (
      <RoleScreenLayout
        style={styles.screen}
        title={model.title}
        subtitle={model.subtitle}
        contentStyle={styles.fill}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.helper}>{model.helper}</Text>
        </View>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout
      style={styles.screen}
      title={model.title}
      subtitle={model.subtitle}
      contentStyle={styles.fill}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onLayout={onScrollLayout}
        onContentSizeChange={onContentSizeChange}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {model.showCompanyFeedback && company.companyFeedback ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{company.companyFeedback}</Text>
          </View>
        ) : null}

        {model.showDeveloperOverride ? (
          <OfficeDeveloperOverrideSection
            activeEffectiveRole={data.developerOverride?.activeEffectiveRole}
            developerRoleSaving={developerRoleSaving}
            roles={developerOverrideRoles}
            onClear={onDeveloperRoleClear}
            onSelectRole={onDeveloperRoleSelect}
          />
        ) : null}

        {model.hasCompany && data.company ? (
          <>
            <OfficeCompanySummarySection
              access={access}
              company={data.company}
              companySection={company}
              onSectionLayout={onSectionLayout}
              onSubtreeLayout={onSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeRoleDirectionsSection
              access={access}
              invite={invite}
              onOpenCard={onOpenOfficeCard}
              onSectionLayout={onSectionLayout}
              onSubtreeLayout={onSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeCompanyDetailsSection
              access={access}
              onSectionLayout={onSectionLayout}
              onSubtreeLayout={onSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeInvitesSection
              access={access}
              data={data}
              invite={invite}
              onSectionLayout={onSectionLayout}
              onSubtreeLayout={onSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeMembersSection
              access={access}
              members={members}
              onSectionLayout={onSectionLayout}
              onSubtreeLayout={onSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
          </>
        ) : (
          <OfficeHubCompanyCreateRootSection
            company={company}
            onSectionLayout={onSectionLayout}
          />
        )}
      </ScrollView>

      <OfficeInviteModalSection
        invite={invite}
        onSubtreeLayout={onSubtreeLayout}
        renderSubtreeBoundary={renderSubtreeBoundary}
      />
    </RoleScreenLayout>
  );
}
