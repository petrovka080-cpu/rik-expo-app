import React from "react";
import { View, Text, Pressable, Animated, ScrollView } from "react-native";
import { UI } from "../buyerUi";
import { SafeView } from "./common/SafeView";
import { TabCount } from "./common/TabCount";
import type { BuyerTab } from "../buyer.types";
import type { StylesBag } from "./component.types";

export const BuyerScreenHeader = React.memo(function BuyerScreenHeader(props: {
  s: StylesBag;
  tab: BuyerTab;
  setTab: (t: BuyerTab) => void;
  buyerFio: string;
  onOpenFioModal: () => void;
  titleSize: number | Animated.Value | Animated.AnimatedInterpolation<number | string>;
  subOpacity: number | Animated.Value | Animated.AnimatedInterpolation<number>;
  inboxCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  subcontractCount?: number;
  tabsScrollRef?: React.RefObject<ScrollView | null>;
  scrollTabsToStart: (animated?: boolean) => void;
}) {
  const {
    s, tab, setTab,
    buyerFio, onOpenFioModal,
    titleSize,
    inboxCount, pendingCount, approvedCount, rejectedCount, subcontractCount,
    tabsScrollRef, scrollTabsToStart,
  } = props;

  return (
    <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
      <View>
        <Animated.Text style={{ fontSize: titleSize, fontWeight: "900", color: UI.text }}>
          Снабженец
        </Animated.Text>
        {!!buyerFio && (
          <Pressable onPress={onOpenFioModal}>
            <Text style={{ fontSize: 13, color: UI.accent, fontWeight: "800", marginTop: 2 }}>
              👤 {buyerFio}
            </Text>
          </Pressable>
        )}
      </View>

      <SafeView style={{ height: 10 }} />

      <ScrollView
        ref={tabsScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("inbox"); }}
          style={[s.tabPill, tab === "inbox" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "inbox" && s.tabPillTextActive]}>Вход</Text>
            <TabCount n={inboxCount} active={tab === "inbox"} s={s} kind="inbox" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("pending"); }}
          style={[s.tabPill, tab === "pending" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "pending" && s.tabPillTextActive]}>Контроль</Text>
            <TabCount n={pendingCount} active={tab === "pending"} s={s} kind="pending" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("approved"); }}
          style={[s.tabPill, tab === "approved" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "approved" && s.tabPillTextActive]}>Готово</Text>
            <TabCount n={approvedCount} active={tab === "approved"} s={s} kind="approved" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("rejected"); }}
          style={[s.tabPill, tab === "rejected" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "rejected" && s.tabPillTextActive]}>Правки</Text>
            <TabCount n={rejectedCount} active={tab === "rejected"} s={s} kind="rejected" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("subcontracts"); }}
          style={[s.tabPill, tab === "subcontracts" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "subcontracts" && s.tabPillTextActive]}>Подряды</Text>
            <TabCount n={subcontractCount || 0} active={tab === "subcontracts"} s={s} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeView>
  );
});
