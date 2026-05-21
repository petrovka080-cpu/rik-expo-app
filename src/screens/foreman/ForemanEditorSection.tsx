import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { LiveRouteMediaEntrypointPanel } from "../../features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel";
import ForemanDraftSummaryCard from "./ForemanDraftSummaryCard";
import {
  buildForemanDraftVisualModel,
  didForemanDraftRollOverToFreshState,
  type ForemanDraftVisualSnapshot,
} from "./foremanDraftVisualState";
import { FOREMAN_DROPDOWN_FIELD_KEYS } from "./foreman.dropdown.constants";
import { debugForemanLogLazy } from "./foreman.debug";
import ForemanDropdown from "./ForemanDropdown";
import type { ContextResolutionResult } from "./foreman.context";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { RefOption } from "./foreman.types";

type Props = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  foreman: string;
  onZoneChange: (v: string) => void;
  onOpenFioModal: () => void;
  objectType: string;
  objectDisplayName: string;
  level: string;
  system: string;
  zone: string;
  contextResult?: ContextResolutionResult;
  formUi: FormContextUiModel;
  objOptions: RefOption[];
  sysOptions: RefOption[];
  onObjectChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSystemChange: (v: string) => void;
  ensureHeaderReady: () => boolean;
  isDraftActive: boolean;
  canStartDraftFlow: boolean;
  showHint: (title: string, text: string) => void;
  setCatalogVisible: (v: boolean) => void;
  busy: boolean;
  onCalcPress: () => void;
  onAiQuickPress: () => void;
  setDraftOpen: (v: boolean) => void;
  onSendDraft?: () => Promise<void>;
  currentDisplayLabel: string;
  itemsCount: number;
  draftSyncStatusLabel: string;
  draftSyncStatusDetail: string | null;
  draftSyncStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  draftSendBusy: boolean;
  headerAttention: ForemanHeaderAttentionState | null;
  ui: { text: string; sub: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanEditorSection(p: Props) {
  const isLowConfidence = p.contextResult?.confidence !== "high";
  const scrollRef = useRef<any>(null);
  const previousDraftVisualRef = useRef<ForemanDraftVisualSnapshot | null>(null);
  const freshDraftAfterSubmitRef = useRef(false);
  const missingKeys = new Set(p.headerAttention?.missingKeys ?? []);

  const draftVisualInput = useMemo<ForemanDraftVisualSnapshot>(
    () => ({
      requestLabel: p.currentDisplayLabel,
      itemsCount: p.itemsCount,
      syncLabel: p.draftSyncStatusLabel,
      syncDetail: p.draftSyncStatusDetail,
      syncTone: p.draftSyncStatusTone,
      isSubmitting: p.draftSendBusy,
    }),
    [
      p.currentDisplayLabel,
      p.draftSendBusy,
      p.draftSyncStatusDetail,
      p.draftSyncStatusLabel,
      p.draftSyncStatusTone,
      p.itemsCount,
    ],
  );

  const freshDraftAfterSubmit =
    didForemanDraftRollOverToFreshState(previousDraftVisualRef.current, draftVisualInput)
    || (
      freshDraftAfterSubmitRef.current
      && draftVisualInput.itemsCount === 0
      && !draftVisualInput.isSubmitting
      && draftVisualInput.syncTone !== "warning"
      && draftVisualInput.syncTone !== "info"
      && draftVisualInput.syncTone !== "danger"
    );

  const draftVisualModel = useMemo(
    () =>
      buildForemanDraftVisualModel({
        ...draftVisualInput,
        freshDraftAfterSubmit,
      }),
    [draftVisualInput, freshDraftAfterSubmit],
  );

  debugForemanLogLazy("[FOREMAN_EDITOR_4_FIELDS]", () => ({
    objectType: p.objectType,

    field1_object: {
      label: "РћР±СЉРµРєС‚ / Р‘Р»РѕРє",
      value: p.objectType,
      options: p.objOptions.map((o) => ({ code: o.code, name: o.name })),
    },

    field2_locator: {
      label: p.formUi.locator.label,
      value: p.level,
      options: p.formUi.locator.options.map((o) => ({ code: o.code, name: o.name })),
    },

    field3_system: {
      label: "Р Р°Р·РґРµР» / Р’РёРґ СЂР°Р±РѕС‚",
      value: p.system,
      options: p.sysOptions.map((o) => ({ code: o.code, name: o.name })),
    },

    field4_zone: {
      label: p.formUi.zone.label,
      value: p.zone,
      options: p.formUi.zone.options.map((o) => ({ code: o.code, name: o.name })),
    },
  }));

  useEffect(() => {
    if (!p.headerAttention?.version) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [p.headerAttention?.version]);

  useEffect(() => {
    freshDraftAfterSubmitRef.current = freshDraftAfterSubmit;
    previousDraftVisualRef.current = draftVisualInput;
  }, [draftVisualInput, freshDraftAfterSubmit]);

  return (
    <>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[p.styles.pagePad, { paddingTop: p.contentTopPad }]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={p.onScroll}
      >
      {p.headerAttention ? (
        <View style={p.styles.headerAttentionCard}>
          <Text style={p.styles.headerAttentionTitle}>Р—Р°РїРѕР»РЅРёС‚Рµ С€Р°РїРєСѓ РїРµСЂРµРґ AI-Р·Р°СЏРІРєРѕР№</Text>
          <Text style={p.styles.headerAttentionText}>{p.headerAttention.message}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 10, gap: 6 }}>
        <ForemanDropdown
          label="РћР±СЉРµРєС‚ / Р‘Р»РѕРє"
          required
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.object}
          options={p.objOptions}
          value={p.objectType}
          valueLabelOverride={p.objectDisplayName}
          onChange={p.onObjectChange}
          placeholder="Р’С‹Р±СЂР°С‚СЊ РѕР±СЉРµРєС‚..."
          width={360}
          attentionActive={missingKeys.has("object")}
          attentionHint={missingKeys.has("object") ? "РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ РѕР±СЉРµРєС‚ / Р±Р»РѕРє." : null}
          attentionToken={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.object ? p.headerAttention.version : 0}
          autoOpenOnAttention={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.object}
          ui={p.ui}
          styles={p.styles}
        />

        {isLowConfidence && p.objectType ? (
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4, fontStyle: "italic" }}>
            РљРѕРЅС‚РµРєСЃС‚: {p.contextResult?.config.objectClass}. РџСЂРѕРІРµСЂСЊС‚Рµ {p.formUi.locator.label?.toLowerCase()}.
          </Text>
        ) : null}

        {!p.formUi.locator.isHidden ? (
          <ForemanDropdown
            key={`loc:${p.objectType}:${p.formUi.locator.label}`}
            label={p.formUi.locator.label}
            required
            showLabel
            fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.locator}
            options={p.formUi.locator.options}
            value={p.level}
            onChange={p.onLevelChange}
            placeholder={p.formUi.locator.placeholder}
            width={360}
            attentionActive={missingKeys.has("locator")}
            attentionHint={missingKeys.has("locator") ? `РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ ${p.formUi.locator.label.toLowerCase()}.` : null}
            attentionToken={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.locator ? p.headerAttention.version : 0}
            autoOpenOnAttention={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.locator}
            ui={p.ui}
            styles={p.styles}
          />
        ) : null}

        <ForemanDropdown
          label="Р Р°Р·РґРµР» / Р’РёРґ СЂР°Р±РѕС‚"
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.system}
          options={p.sysOptions}
          value={p.system}
          onChange={p.onSystemChange}
          placeholder="Р’С‹Р±СЂР°С‚СЊ СЂР°Р·РґРµР»..."
          width={360}
          ui={p.ui}
          styles={p.styles}
        />

        <ForemanDropdown
          key={`zone:${p.objectType}:${p.formUi.zone.label}`}
          label={p.formUi.zone.label}
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.zone}
          options={p.formUi.zone.options}
          value={p.zone}
          onChange={p.onZoneChange}
          placeholder={p.formUi.zone.placeholder}
          width={360}
          ui={p.ui}
          styles={p.styles}
        />
      </View>

      <View style={p.styles.section}>
        <View style={p.styles.pickTabsRow}>
          <Pressable
            testID="foreman-catalog-open"
            accessibilityLabel="foreman-catalog-open"
            accessibilityRole="button"
            accessibilityHint="РћС‚РєСЂС‹РІР°РµС‚ РєР°С‚Р°Р»РѕРі РјР°С‚РµСЂРёР°Р»РѕРІ РґР»СЏ С‚РµРєСѓС‰РµР№ Р·Р°СЏРІРєРё"
            onPress={() => {
              if (!p.ensureHeaderReady()) return;
              if (!p.canStartDraftFlow) {
                p.showHint("РџСЂРѕСЃРјРѕС‚СЂ Р·Р°СЏРІРєРё", "Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РґРѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РІ С‚РµРєСѓС‰РµРј С‡РµСЂРЅРѕРІРёРєРµ.");
                return;
              }
              p.setCatalogVisible(true);
            }}
            disabled={p.busy}
            style={[p.styles.pickTabBtn, p.styles.pickTabCatalog, p.busy && { opacity: 0.5 }]}
          >
            <Ionicons name="list" size={18} color={p.ui.text} />
            <Text style={p.styles.pickTabText}>РљР°С‚Р°Р»РѕРі</Text>
          </Pressable>

          <Pressable
            testID="foreman-calc-open"
            accessibilityLabel="foreman-calc-open"
            accessibilityRole="button"
            accessibilityHint="РћС‚РєСЂС‹РІР°РµС‚ СЃРјРµС‚Сѓ РґР»СЏ С‚РµРєСѓС‰РµР№ Р·Р°СЏРІРєРё"
            accessibilityState={{ disabled: p.busy }}
            onPress={p.onCalcPress}
            disabled={p.busy}
            style={[p.styles.pickTabBtn, p.styles.pickTabSoft, p.busy && { opacity: 0.5 }]}
          >
            <Ionicons name="calculator-outline" size={18} color={p.ui.text} />
            <Text style={p.styles.pickTabText}>РЎРјРµС‚Р°</Text>
          </Pressable>
        </View>

        <Pressable
          testID="foreman-ai-quick-open"
          accessibilityLabel="foreman-ai-quick-open"
          accessibilityRole="button"
          accessibilityHint="РћС‚РєСЂС‹РІР°РµС‚ Р±С‹СЃС‚СЂС‹Р№ AI-РїРѕРјРѕС‰РЅРёРє РґР»СЏ Р·Р°РїРѕР»РЅРµРЅРёСЏ Р·Р°СЏРІРєРё"
          accessibilityState={{ disabled: p.busy }}
          onPress={p.onAiQuickPress}
          disabled={p.busy}
          style={[
            p.styles.pickTabBtn,
            p.styles.pickTabSoft,
            {
              marginTop: 10,
            },
            p.busy && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="sparkles-outline" size={18} color={p.ui.text} />
          <Text style={p.styles.pickTabText}>AI заявка</Text>
        </Pressable>
      </View>

      <LiveRouteMediaEntrypointPanel variant="foremanMaterials" />

        <ForemanDraftSummaryCard
          model={draftVisualModel}
          disabled={p.draftSendBusy}
          onPress={() => p.setDraftOpen(true)}
          ui={p.ui}
          styles={p.styles}
        />
      </Animated.ScrollView>


    </>
  );
}
