import React from "react";
import { TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import IconSquareButton from "../../../ui/IconSquareButton";
import { BUYER_SEARCH_PLACEHOLDER } from "../buyer.screen.constants";
import type { StylesBag } from "./component.types";

type BuyerSearchBarProps = {
  s: StylesBag;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  showWebRefreshButton: boolean;
  onRefresh: () => void;
  refreshAccessibilityLabel: string;
};

export const BuyerSearchBar = React.memo(function BuyerSearchBar({
  s,
  searchQuery,
  onChangeSearchQuery,
  showWebRefreshButton,
  onRefresh,
  refreshAccessibilityLabel,
}: BuyerSearchBarProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TextInput
        testID="buyer-search-input"
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        placeholder={BUYER_SEARCH_PLACEHOLDER}
        placeholderTextColor="rgba(255,255,255,0.4)"
        style={[
          s.fieldInput,
          {
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            height: 44,
            borderStyle: "solid",
          },
        ]}
      />
      {showWebRefreshButton ? (
        <IconSquareButton
          onPress={onRefresh}
          accessibilityLabel={refreshAccessibilityLabel}
          width={44}
          height={44}
          radius={14}
          bg="rgba(255,255,255,0.08)"
          bgPressed="rgba(255,255,255,0.14)"
          bgDisabled="rgba(255,255,255,0.04)"
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
        </IconSquareButton>
      ) : null}
    </View>
  );
});
