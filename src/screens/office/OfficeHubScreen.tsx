import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";

type OfficeCard = {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  tone: string;
};

const OFFICE_CARDS: OfficeCard[] = [
  {
    key: "foreman",
    title: "Прораб",
    subtitle: "Заявки, сметы, субподряд и полевой контур.",
    route: "/office/foreman",
    tone: "#2563EB",
  },
  {
    key: "buyer",
    title: "Снабженец",
    subtitle: "Закупки, предложения и поставщики.",
    route: "/office/buyer",
    tone: "#7C3AED",
  },
  {
    key: "director",
    title: "Директор",
    subtitle: "Контроль, финансы и обзор исполнения.",
    route: "/office/director",
    tone: "#0F766E",
  },
  {
    key: "accountant",
    title: "Бухгалтер",
    subtitle: "Платежи, документы и финансовый контур.",
    route: "/office/accountant",
    tone: "#CA8A04",
  },
  {
    key: "warehouse",
    title: "Склад",
    subtitle: "Приемка, выдача и остатки материалов.",
    route: "/office/warehouse",
    tone: "#9333EA",
  },
  {
    key: "contractor",
    title: "Подрядчик",
    subtitle: "Исполнение, статусы и рабочие задачи.",
    route: "/office/contractor",
    tone: "#059669",
  },
  {
    key: "reports",
    title: "Отчеты",
    subtitle: "Сводки, дашборды и аналитические модули.",
    route: "/office/reports",
    tone: "#EA580C",
  },
  {
    key: "security",
    title: "Безопасность",
    subtitle: "Сохранено внутри офиса без отдельного нижнего таба.",
    route: "/office/security",
    tone: "#DC2626",
  },
];

export default function OfficeHubScreen() {
  const router = useRouter();

  return (
    <RoleScreenLayout
      style={styles.screen}
      title="Офис"
      contentStyle={styles.content}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {OFFICE_CARDS.map((card) => (
            <Pressable
              key={card.key}
              testID={`office-card-${card.key}`}
              onPress={() => router.push(card.route as Href)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: `${card.tone}33` },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.cardAccent, { backgroundColor: card.tone }]} />
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </RoleScreenLayout>
  );
}

export { OFFICE_CARDS };

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    minHeight: 144,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-start",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardAccent: {
    width: 42,
    height: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 8,
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
});
