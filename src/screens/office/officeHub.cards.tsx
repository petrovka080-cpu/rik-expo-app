/**
 * Presentational leaf components extracted from OfficeHubScreen.tsx.
 * Behavior-preserving mechanical extraction (Wave F).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getProfileRoleLabel } from "../profile/profile.helpers";
import { OFFICE_ASSIGNABLE_ROLES, type OfficeWorkspaceCard } from "./officeAccess.model";
import type { OfficeAccessInvite, OfficeAccessMember } from "./officeAccess.types";
import { COPY, formatDate } from "./officeHub.constants";

export function DirectionCard(props: {
  card: OfficeWorkspaceCard;
  canInvite: boolean;
  onOpen: () => void;
  onInvite: () => void;
}) {
  const disabled = props.card.entryKind !== "screen" || !props.card.route;

  return (
    <View
      testID={`office-card-${props.card.key}`}
      style={[styles.card, props.card.primary && styles.cardPrimary]}
    >
      <View style={styles.cardHead}>
        <View
          style={[
            styles.accent,
            {
              backgroundColor: props.card.primary ? "#FFFFFF" : props.card.tone,
            },
          ]}
        />
        {props.canInvite && props.card.inviteRole ? (
          <Pressable
            testID={`office-direction-add-${props.card.key}`}
            onPress={props.onInvite}
            style={({ pressed }) => [
              styles.add,
              props.card.primary && styles.addPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.addText,
                props.card.primary && styles.addTextPrimary,
              ]}
            >
              +
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        testID={`office-direction-open-${props.card.key}`}
        disabled={disabled}
        onPress={props.onOpen}
        style={({ pressed }) => [
          styles.stack,
          disabled && styles.dim,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            props.card.primary && styles.cardTitlePrimary,
          ]}
        >
          {props.card.title}
        </Text>
        <Text
          style={[
            styles.cardSubtitle,
            props.card.primary && styles.cardSubtitlePrimary,
          ]}
        >
          {props.card.subtitle}
        </Text>
      </Pressable>
    </View>
  );
}

export function MemberCard(props: {
  member: OfficeAccessMember;
  canManage: boolean;
  savingRole: string | null;
  onAssignRole: (memberUserId: string, nextRole: string) => void;
}) {
  const roleLabel = getProfileRoleLabel(props.member.role);

  return (
    <View style={styles.entity}>
      <View style={styles.entityHeader}>
        <View style={styles.entityHeaderMain}>
          <Text style={styles.entityTitle}>
            {props.member.fullName?.trim() || props.member.userId}
          </Text>
          <Text style={styles.entityMeta}>{roleLabel}</Text>
        </View>
        <View style={styles.memberStatusRow}>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, styles.statusTextActive]}>
              {COPY.memberActiveStatus}
            </Text>
          </View>
          {props.member.isOwner ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>owner</Text>
            </View>
          ) : null}
        </View>
      </View>
      {props.member.phone ? (
        <Text style={styles.entityMeta}>{props.member.phone}</Text>
      ) : null}
      {props.member.createdAt ? (
        <Text style={styles.entityMeta}>
          Добавлен: {formatDate(props.member.createdAt)}
        </Text>
      ) : null}
      {props.canManage && !props.member.isOwner ? (
        <View style={styles.chips}>
          {OFFICE_ASSIGNABLE_ROLES.map((role) => {
            const active = props.member.role === role;
            const roleKey = `${props.member.userId}:${role}`;
            return (
              <Pressable
                key={roleKey}
                testID={`office-member-role-${props.member.userId}-${role}`}
                disabled={Boolean(props.savingRole) || active}
                onPress={() => props.onAssignRole(props.member.userId, role)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {getProfileRoleLabel(role)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function InviteCard(props: { invite: OfficeAccessInvite }) {
  return (
    <View style={styles.entity}>
      <View style={styles.entityHeader}>
        <View style={styles.entityHeaderMain}>
          <Text style={styles.entityTitle}>{props.invite.name}</Text>
          <Text style={styles.entityMeta}>
            {getProfileRoleLabel(props.invite.role)}
          </Text>
        </View>
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Text style={[styles.statusText, styles.statusTextPending]}>
            {props.invite.status}
          </Text>
        </View>
      </View>
      <Text style={styles.entityMeta}>{props.invite.phone}</Text>
      {props.invite.email ? (
        <Text style={styles.entityMeta}>{props.invite.email}</Text>
      ) : null}
      <Text style={styles.entityMeta}>Код: {props.invite.inviteCode}</Text>
      <Text style={styles.entityMeta}>
        Создано: {formatDate(props.invite.createdAt)}
      </Text>
    </View>
  );
}

/**
 * Styles for the extracted card components.
 * These duplicate the relevant subset from the main OfficeHubScreen styles.
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8EBF0",
  },
  cardPrimary: {
    backgroundColor: "#1A56DB",
    borderColor: "#1A56DB",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  accent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: "#1A56DB",
  },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  addPrimary: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  addText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A56DB",
    lineHeight: 20,
  },
  addTextPrimary: {
    color: "#FFFFFF",
  },
  stack: {
    gap: 4,
  },
  dim: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  cardTitlePrimary: {
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  cardSubtitlePrimary: {
    color: "rgba(255,255,255,0.8)",
  },
  entity: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8EBF0",
  },
  entityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  entityHeaderMain: {
    flex: 1,
    gap: 2,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  entityMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  memberStatusRow: {
    flexDirection: "row",
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusPending: {
    backgroundColor: "#FEF9C3",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  statusTextActive: {
    color: "#16A34A",
  },
  statusTextPending: {
    color: "#CA8A04",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  chipActive: {
    backgroundColor: "#1A56DB",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
