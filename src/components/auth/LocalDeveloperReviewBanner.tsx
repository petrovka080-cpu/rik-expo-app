import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  isLocalDeveloperReviewEnabled,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  switchLocalDeveloperPrincipal,
  type LocalDeveloperReviewRole,
} from "../../lib/localDeveloperReview";

const ROLE_LABELS: Record<LocalDeveloperReviewRole, string> = {
  foreman: "Прораб",
  director: "Директор",
  buyer: "Закупщик",
  accountant: "Бухгалтер",
  warehouse: "Склад",
  contractor: "Подрядчик",
  security: "Охрана",
  estimator: "Сметчик",
  engineer: "Инженер",
};

export function LocalDeveloperReviewBanner({
  authenticatedRole = null,
}: {
  authenticatedRole?: string | null;
}) {
  const enabled = isLocalDeveloperReviewEnabled();
  const [expanded, setExpanded] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<LocalDeveloperReviewRole | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setActiveRole(authenticatedRole);
  }, [authenticatedRole]);

  if (!enabled) return null;

  const selectRole = (role: LocalDeveloperReviewRole) => {
    setError(false);
    setSavingRole(role);
    void switchLocalDeveloperPrincipal(role)
      .then(() => {
        setActiveRole(role);
      })
      .catch(() => setError(true))
      .finally(() => setSavingRole(null));
  };

  return (
    <View style={styles.root} testID="local-developer-review-banner">
      <View style={styles.summary}>
        <Text style={styles.label}>Локальный режим разработчика — не production</Text>
        <Text style={styles.role} testID="local-developer-active-role">
          {activeRole && activeRole in ROLE_LABELS
            ? ROLE_LABELS[activeRole as LocalDeveloperReviewRole]
            : "Вход не выполнен"}
        </Text>
        {!activeRole ? (
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(savingRole)}
            onPress={() => selectRole("director")}
            style={styles.directorLogin}
            testID="local-developer-director-login"
          >
            <Text style={styles.directorLoginText}>
              {savingRole === "director" ? "Входим…" : "Войти как Директор"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((current) => !current)}
          style={styles.toggle}
          testID="local-developer-role-toggle"
        >
          <Text style={styles.toggleText}>{expanded ? "Скрыть роли" : "Сменить роль"}</Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.roles} testID="local-developer-role-list">
          {LOCAL_DEVELOPER_REVIEW_ROLES.map((role) => (
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(savingRole)}
              key={role}
              onPress={() => selectRole(role)}
              style={[styles.roleButton, activeRole === role && styles.roleButtonActive]}
              testID={`local-developer-role-${role}`}
            >
              <Text style={styles.roleButtonText}>
                {savingRole === role ? "Входим…" : ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
          {error ? (
            <Text style={styles.error} testID="local-developer-role-error">
              Не удалось войти под выбранной локальной ролью. Повторите запуск среды.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#7C2D12", paddingHorizontal: 12, paddingVertical: 7 },
  summary: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  label: { color: "#FFEDD5", fontSize: 12, fontWeight: "900" },
  role: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  toggle: { borderRadius: 7, backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { color: "#7C2D12", fontSize: 11, fontWeight: "800" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  roleButton: { borderRadius: 7, borderWidth: 1, borderColor: "#FDBA74", paddingHorizontal: 9, paddingVertical: 5 },
  roleButtonActive: { backgroundColor: "#C2410C" },
  roleButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  error: { width: "100%", color: "#FEE2E2", fontSize: 11, fontWeight: "700" },
  directorLogin: {
    borderRadius: 7,
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  directorLoginText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
