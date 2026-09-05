import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  isLocalDeveloperReviewEnabled,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  restoreLocalDeveloperOwnerSession,
  type LocalDeveloperReviewRole,
} from "../../lib/localDeveloperReview";
import {
  isServerAuthorizedPlatformDeveloper,
  loadDeveloperOverrideContext,
  setDeveloperEffectiveRole,
} from "../../lib/developerOverride";

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
  const [developerAuthorized, setDeveloperAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [error, setError] = useState(false);
  const automaticLoginAttempted = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const applyServerContext = async () => {
      const context = await loadDeveloperOverrideContext();
      if (!mounted) return;
      const authorized = isServerAuthorizedPlatformDeveloper(context);
      setDeveloperAuthorized(authorized);
      setActiveRole(
        authorized
          ? context.activeEffectiveRole ?? authenticatedRole
          : authenticatedRole,
      );
    };

    setCheckingAccess(true);
    setError(false);
    const establishAccess = async () => {
      if (!authenticatedRole && !automaticLoginAttempted.current) {
        automaticLoginAttempted.current = true;
        setSavingRole("director");
        await restoreLocalDeveloperOwnerSession();
      }
      await applyServerContext();
    };
    void establishAccess()
      .catch(() => {
        if (!mounted) return;
        setDeveloperAuthorized(false);
        setActiveRole(authenticatedRole);
        setError(true);
      })
      .finally(() => {
        if (mounted) {
          setSavingRole(null);
          setCheckingAccess(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [authenticatedRole, enabled]);

  if (!enabled) return null;

  const selectRole = (role: LocalDeveloperReviewRole) => {
    if (!developerAuthorized) return;
    setError(false);
    setSavingRole(role);
    void setDeveloperEffectiveRole(role)
      .then((context) => {
        setDeveloperAuthorized(isServerAuthorizedPlatformDeveloper(context));
        setActiveRole(context.activeEffectiveRole);
      })
      .catch(() => setError(true))
      .finally(() => setSavingRole(null));
  };

  return (
    <View style={styles.root} testID="local-developer-review-banner">
      <View style={styles.summary}>
        <Text style={styles.label}>Локальный режим разработчика — не production</Text>
        <Text style={styles.role} testID="local-developer-active-role">
          {checkingAccess
            ? "Проверяем доступ"
            : activeRole && activeRole in ROLE_LABELS
            ? ROLE_LABELS[activeRole as LocalDeveloperReviewRole]
            : activeRole ?? "Вход не выполнен"}
        </Text>
        {!activeRole && !checkingAccess ? (
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(savingRole)}
            onPress={() => {
              automaticLoginAttempted.current = false;
              setCheckingAccess(true);
              setSavingRole("director");
              void restoreLocalDeveloperOwnerSession()
                .then(loadDeveloperOverrideContext)
                .then((context) => {
                  setDeveloperAuthorized(isServerAuthorizedPlatformDeveloper(context));
                  setActiveRole(context.activeEffectiveRole);
                  setError(false);
                })
                .catch(() => setError(true))
                .finally(() => {
                  setSavingRole(null);
                  setCheckingAccess(false);
                });
            }}
            style={styles.directorLogin}
            testID="local-developer-director-login"
          >
            <Text style={styles.directorLoginText}>
              {savingRole === "director" ? "Входим…" : "Войти как владелец"}
            </Text>
          </Pressable>
        ) : null}
        {developerAuthorized ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((current) => !current)}
            style={styles.toggle}
            testID="local-developer-role-toggle"
          >
            <Text style={styles.toggleText}>{expanded ? "Скрыть роли" : "Сменить роль"}</Text>
          </Pressable>
        ) : null}
      </View>
      {expanded && developerAuthorized ? (
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
              Не удалось применить выбранную роль разработчика. Проверьте entitlement и повторите запуск среды.
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
