import React from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import ForemanMaterialsContent from "./ForemanMaterialsContent";
import ForemanSubcontractTab from "./ForemanSubcontractTab";
import { useForemanScreenController } from "./useForemanScreenController";

export function ForemanScreen() {
  const vm = useForemanScreenController();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={vm.keyboardBehavior}
    >
      <RoleScreenLayout style={[vm.styles.container, { backgroundColor: vm.ui.bg }]}>
        <View pointerEvents="none" style={vm.styles.bgGlow} />
        <Animated.View
          style={[
            vm.styles.cHeader,
            {
              height: vm.headerHeight,
              shadowOpacity: vm.headerShadow,
              elevation: 8,
            },
          ]}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Animated.Text
                  style={[vm.styles.cTitle, { fontSize: vm.titleSize, color: vm.ui.text }]}
                  numberOfLines={1}
                >
                  {vm.screenTitle}
                </Animated.Text>
                <Pressable
                  onPress={vm.openFioModal}
                  style={{ marginTop: 6, minWidth: 0 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name="person-outline" size={16} color={vm.ui.sub} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ color: vm.ui.text, fontSize: 13, fontWeight: "700" }}
                      >
                        {vm.headerIdentityPrimary}
                      </Text>
                      {vm.headerIdentitySecondary ? (
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{ color: vm.ui.sub, fontSize: 11, fontWeight: "600", marginTop: 2 }}
                        >
                          {vm.headerIdentitySecondary}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
              {vm.mainTab ? (
                <Pressable
                  onPress={vm.closeMainTab}
                  testID="foreman-main-tab-close"
                  accessibilityLabel="foreman-main-tab-close"
                  accessible
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <Text style={{ color: vm.ui.text, fontWeight: "600", fontSize: 20, lineHeight: 22 }}>×</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {!vm.mainTab ? (
          <View
            style={{
              flex: 1,
              paddingTop: vm.contentTopPad + 56,
              paddingHorizontal: 16,
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 14,
            }}
          >
            <Pressable
              testID="foreman-main-materials-open"
              accessibilityLabel="foreman-main-materials-open"
              accessible
              onPress={vm.openMaterialsTab}
              style={{
                width: "100%",
                maxWidth: 370,
                height: 72,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: "#121A2A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: vm.ui.text, fontWeight: "600", fontSize: 22, lineHeight: 28 }}>[ Материалы ]</Text>
            </Pressable>

            <Pressable
              testID="foreman-main-subcontracts-open"
              accessibilityLabel="foreman-main-subcontracts-open"
              accessible
              onPress={vm.openSubcontractsTab}
              style={{
                width: "100%",
                maxWidth: 370,
                height: 72,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: "#121A2A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: vm.ui.text, fontWeight: "600", fontSize: 22, lineHeight: 28 }}>[ Подряды ]</Text>
            </Pressable>
          </View>
        ) : null}

        {vm.mainTab === "subcontracts" ? (
          <ForemanSubcontractTab {...vm.subcontractTabProps} />
        ) : null}

        {vm.mainTab === "materials" ? (
          <ForemanMaterialsContent {...vm.materialsContentProps} />
        ) : null}
      </RoleScreenLayout>
    </KeyboardAvoidingView>
  );
}
