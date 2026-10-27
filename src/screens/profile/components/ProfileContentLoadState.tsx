import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ProfileOtaDiagnosticsCard } from "@/src/features/profile/ProfileOtaDiagnosticsCard";
import { profileStyles } from "../profile.styles";

const styles = profileStyles;

type ProfileLoadErrorStateProps = {
  errorMessage: string | null;
  onRetry: () => void;
  onSignOut: () => void;
};

export function ProfileLoadErrorState({
  errorMessage,
  onRetry,
  onSignOut,
}: ProfileLoadErrorStateProps) {
  const hasDiagnostic = Boolean(errorMessage?.trim());
  return (
    <View style={styles.screen} testID="profile-load-error-shell">
      <ScrollView
        style={styles.scrollFill}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.profileTitle}>{"\u041f\u0440\u043e\u0444\u0438\u043b\u044c"}</Text>
          <Text style={styles.profileTitleSubtitle}>
            {hasDiagnostic
              ? "Учётная запись подтверждена, но дополнительные данные профиля сейчас недоступны."
              : "Не удалось загрузить дополнительные данные профиля. Попробуйте ещё раз."}
          </Text>
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.profileEditButton}
            testID="profile-load-retry"
          >
            <Text style={styles.profileEditButtonText}>{"\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onSignOut}
            style={[styles.profileEditButton, { marginTop: 10 }]}
            testID="profile-load-sign-out"
          >
            <Text style={styles.profileEditButtonText}>Выйти</Text>
          </Pressable>
        </View>

        <View style={styles.section} testID="profile-ota-diagnostics-fallback">
          <Text style={styles.sectionTitle}>Release & OTA</Text>
          <ProfileOtaDiagnosticsCard />
        </View>
      </ScrollView>
    </View>
  );
}
