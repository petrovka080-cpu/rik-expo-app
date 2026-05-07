import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ProfileOtaDiagnosticsCard } from "@/src/features/profile/ProfileOtaDiagnosticsCard";
import { profileStyles } from "../profile.styles";

const styles = profileStyles;

type ProfileLoadErrorStateProps = {
  errorMessage: string | null;
  onRetry: () => void;
};

export function ProfileLoadErrorState({
  errorMessage,
  onRetry,
}: ProfileLoadErrorStateProps) {
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
            {errorMessage ??
              "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437."}
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
        </View>

        <View style={styles.section} testID="profile-ota-diagnostics-fallback">
          <Text style={styles.sectionTitle}>Release & OTA</Text>
          <ProfileOtaDiagnosticsCard />
        </View>
      </ScrollView>
    </View>
  );
}
