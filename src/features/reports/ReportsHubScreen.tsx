import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  REPORTS_MODULE_ROUTES,
  type ReportsModuleRouteKey,
} from "../../lib/navigation/coreRoutes";
import { OFFICE_ROLE_UI, officeRoleChrome, useIsOfficeRoute } from "../../screens/office/officeRoleChrome";

type ReportModuleCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  routeKey: ReportsModuleRouteKey;
};

const REPORT_MODULES: ReportModuleCard[] = [
  {
    key: "dashboard",
    title: "\u0421\u0432\u043e\u0434\u043d\u0430\u044f \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430",
    subtitle:
      "\u041e\u0431\u043e\u0440\u043e\u0442\u044b, \u0437\u0430\u0442\u0440\u0430\u0442\u044b, \u0434\u043e\u043b\u0433\u0438, \u0432\u043e\u0440\u043e\u043d\u043a\u0430 \u0437\u0430\u043a\u0443\u043f\u043e\u043a \u0438 \u044d\u043a\u0441\u043f\u043e\u0440\u0442 \u043e\u0442\u0447\u0435\u0442\u043e\u0432.",
    icon: "bar-chart",
    accent: "#0EA5E9",
    routeKey: "dashboard",
  },
  {
    key: "ai-assistant",
    title: "AI-\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442",
    subtitle:
      "\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u043d\u044b\u0439 \u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u043f\u043e \u043e\u0442\u0447\u0435\u0442\u0430\u043c \u0438 \u043c\u043e\u0434\u0443\u043b\u044f\u043c \u0431\u0435\u0437 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432.",
    icon: "sparkles",
    accent: "#F59E0B",
    routeKey: "ai-assistant",
  },
];

const HERO_TITLE = "\u041e\u0442\u0447\u0435\u0442\u044b";
const HERO_SUBTITLE = "\u041c\u043e\u0434\u0443\u043b\u0438 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0438 \u0438 AI-\u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u0432 \u043e\u0434\u043d\u043e\u043c \u0432\u0445\u043e\u0434\u0435.";
const OPEN_LABEL = "\u041e\u0442\u043a\u0440\u044b\u0442\u044c";

export default function ReportsHubScreen() {
  const router = useRouter();
  const isOfficeRoute = useIsOfficeRoute();

  return (
    <ScrollView
      style={officeRoleChrome.screen}
      contentContainerStyle={officeRoleChrome.content}
      showsVerticalScrollIndicator={false}
    >
      {!isOfficeRoute ? (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{HERO_TITLE}</Text>
          <Text style={styles.heroSubtitle}>{HERO_SUBTITLE}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {REPORT_MODULES.map((module) => (
          <Pressable
            key={module.key}
            style={({ pressed }) => [
              styles.card,
              { borderColor: module.accent, opacity: pressed ? 0.92 : 1 },
            ]}
            onPress={() => router.push(REPORTS_MODULE_ROUTES[module.routeKey])}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${module.accent}22` }]}>
              <Ionicons name={module.icon} size={24} color={module.accent} />
            </View>
            <Text style={styles.cardTitle}>{module.title}</Text>
            <Text style={styles.cardSubtitle}>{module.subtitle}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, { color: module.accent }]}>{OPEN_LABEL}</Text>
              <Ionicons name="arrow-forward" size={16} color={module.accent} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: OFFICE_ROLE_UI.border,
    gap: 8,
  },
  heroTitle: {
    color: OFFICE_ROLE_UI.text,
    fontSize: 22,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: OFFICE_ROLE_UI.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#A5B4C8",
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardAction: {
    fontSize: 14,
    fontWeight: "700",
  },
});
