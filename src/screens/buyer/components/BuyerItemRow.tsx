import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  Modal,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/api/types";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { LineMeta } from "../buyer.types";
import { splitNote } from "../buyerUtils";
import { buyerStyles as styles } from "../buyer.styles";
import { P_LIST, P_SHEET } from "../buyerUi";
import { useBuyerItemEditorModel } from "../hooks/useBuyerItemEditorModel";
import type { StylesBag } from "./component.types";

type BuyerItemEditorProps = {
  it: BuyerInboxRow;
  m: LineMeta;
  s: StylesBag;
  inSheet?: boolean;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  onPickSupplier: (name: string) => void;
  onFocusField?: () => void;
};

const supplierKeyExtractor = (item: string, idx: number) => `${item}:${idx}`;
const INLINE_SUPPLIER_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 3,
  removeClippedSubviews: false,
} as const;
const MODAL_SUPPLIER_FLATLIST_TUNING = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 32,
  windowSize: 5,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

export const BuyerItemEditor = React.memo(function BuyerItemEditor(props: BuyerItemEditorProps) {
  const {
    m,
    s,
    inSheet,
    counterpartyLabel,
    supplierSuggestions,
    hasAnyCounterpartyOptions,
    counterpartyHardFailure,
    onSetPrice,
    onSetSupplier,
    onSetNote,
    onPickSupplier,
    onFocusField,
  } = props;

  const {
    P,
    isMobileRuntime,
    shouldStackPrimaryFields,
    editorCardStyle,
    noteAuto,
    priceDraft,
    setPriceDraft,
    noteDraft,
    setNoteDraft,
    supplierQueryDraft,
    setSupplierQueryDraft,
    selectedSupplierLabel,
    isDropdownOpen,
    isSupplierModalOpen,
    filteredSuppliers,
    fieldInputStyle,
    mobileSupplierTriggerStyle,
    mobileSupplierLabelStyle,
    noteInputStyle,
    noteAutoCardStyle,
    noteAutoLabelStyle,
    noteAutoValueStyle,
    modalSearchInputStyle,
    modalEmptyTextStyle,
    inlineSuggestBoxStyle,
    inlineSuggestItemTextStyle,
    modalSupplierRowTextStyle,
    commitSelectedSupplier,
    openPicker,
    handlePriceFocus,
    commitPriceDraft,
    handlePriceBlur,
    handleSupplierLayout,
    handleSupplierTextChange,
    handleSupplierBlur,
    handleNoteFocus,
    handleNoteBlur,
    closeSupplierModal,
    handleInlineSupplierPressIn,
    isSupplierItemSelected,
  } = useBuyerItemEditorModel({
    m,
    s,
    inSheet,
    supplierSuggestions,
    hasAnyCounterpartyOptions,
    onSetPrice,
    onSetSupplier,
    onSetNote,
    onPickSupplier,
    onFocusField,
  });

  const renderInlineSupplierItem = React.useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        onPressIn={handleInlineSupplierPressIn}
        style={({ pressed }) => [
          s.suggestItem,
          styles.inlineSuggestItem,
          {
            borderColor: P.inputBorder,
            backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "#1E2A38",
          },
        ]}
        onPress={() => commitSelectedSupplier(item)}
      >
        <Text style={inlineSuggestItemTextStyle} numberOfLines={1}>
          {item}
        </Text>
      </Pressable>
    ),
    [P.inputBorder, commitSelectedSupplier, handleInlineSupplierPressIn, inlineSuggestItemTextStyle, s.suggestItem],
  );

  const renderModalSupplierItem = React.useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        onPress={() => commitSelectedSupplier(item)}
        style={[
          styles.modalSupplierRow,
          isSupplierItemSelected(item)
            ? styles.modalSupplierRowSelected
            : styles.modalSupplierRowDefault,
        ]}
      >
        <Text style={modalSupplierRowTextStyle} numberOfLines={1}>
          {item}
        </Text>
      </Pressable>
    ),
    [commitSelectedSupplier, isSupplierItemSelected, modalSupplierRowTextStyle],
  );

  return (
    <View
      style={[styles.editorCardBase, editorCardStyle]}
    >
      <View style={styles.editorStatusRow}>
        <StatusBadge label="Редактируется" tone="info" compact />
      </View>

      <View
        style={[
          styles.primaryFieldsBase,
          shouldStackPrimaryFields ? styles.primaryFieldsStack : styles.primaryFieldsInline,
          isDropdownOpen ? styles.primaryFieldsOpen : styles.primaryFieldsClosed,
        ]}
      >
        <View style={styles.flexOne}>
          <TextInput
            value={priceDraft}
            onChangeText={setPriceDraft}
            keyboardType={Platform.OS === "web" ? "default" : "decimal-pad"}
            returnKeyType="done"
            blurOnSubmit={false}
            placeholder="Цена *"
            placeholderTextColor={P.sub}
            autoCorrect={false}
            autoCapitalize="none"
            onFocus={handlePriceFocus}
            onBlur={handlePriceBlur}
            onEndEditing={commitPriceDraft}
            style={fieldInputStyle}
          />
        </View>

        <View
          style={[
            styles.supplierFieldWrap,
            isDropdownOpen ? styles.supplierFieldWrapOpen : styles.supplierFieldWrapClosed,
          ]}
        >
          {isMobileRuntime ? (
            <Pressable
              onPress={openPicker}
              disabled={!hasAnyCounterpartyOptions}
              style={mobileSupplierTriggerStyle}
            >
              <Text
                style={mobileSupplierLabelStyle}
                numberOfLines={1}
              >
                {selectedSupplierLabel || `${counterpartyLabel} *`}
              </Text>
              <Ionicons name="chevron-down" size={18} color={P.sub} />
            </Pressable>
          ) : (
            <View
              onLayout={handleSupplierLayout}
            >
              <TextInput
                value={isDropdownOpen ? supplierQueryDraft : selectedSupplierLabel}
                onChangeText={handleSupplierTextChange}
                returnKeyType="done"
                blurOnSubmit={false}
                placeholder={`${counterpartyLabel} *`}
                placeholderTextColor={P.sub}
                editable={hasAnyCounterpartyOptions}
                onFocus={openPicker}
                onBlur={handleSupplierBlur}
                style={fieldInputStyle}
              />
            </View>
          )}

          {isDropdownOpen && filteredSuppliers.length > 0 ? (
            <View
              style={inlineSuggestBoxStyle}
              pointerEvents="auto"
            >
              <FlatList
                data={filteredSuppliers}
                keyExtractor={supplierKeyExtractor}
                keyboardShouldPersistTaps="always"
                style={styles.inlineSupplierList}
                renderItem={renderInlineSupplierItem}
                {...INLINE_SUPPLIER_FLATLIST_TUNING}
              />
            </View>
          ) : null}
          {counterpartyHardFailure ? (
            <Text style={styles.counterpartyFailureText}>
              Справочник контрагентов недоступен.
            </Text>
          ) : null}
        </View>
      </View>

      <TextInput
        value={noteDraft}
        onChangeText={setNoteDraft}
        placeholder="Примечание"
        placeholderTextColor={P.sub}
        multiline
        blurOnSubmit={false}
        onFocus={handleNoteFocus}
        onBlur={handleNoteBlur}
        style={noteInputStyle}
      />

      {noteAuto ? (
        <View
          style={noteAutoCardStyle}
        >
          <Text style={noteAutoLabelStyle}>
            Реквизиты поставщика
          </Text>
          <Text style={noteAutoValueStyle} numberOfLines={3}>
            {noteAuto.replace(/\n+/g, " • ")}
          </Text>
        </View>
      ) : null}

      {isMobileRuntime ? (
        <Modal
          visible={isSupplierModalOpen}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeSupplierModal}
        >
          <SafeAreaView style={styles.supplierModalSafeArea}>
            <View style={styles.supplierModalContent}>
              <View style={styles.supplierModalHeader}>
                <Text style={[styles.supplierModalTitle, { color: P.text }]}>
                  Выберите {counterpartyLabel.toLowerCase()}
                </Text>
                <Pressable
                  onPress={closeSupplierModal}
                  style={styles.supplierModalCloseButton}
                >
                  <Ionicons name="close" size={20} color={P.text} />
                </Pressable>
              </View>

              <TextInput
                value={supplierQueryDraft}
                onChangeText={setSupplierQueryDraft}
                autoFocus
                returnKeyType="search"
                blurOnSubmit={false}
                placeholder={`Поиск ${counterpartyLabel.toLowerCase()}`}
                placeholderTextColor={P.sub}
                style={modalSearchInputStyle}
              />

              <FlatList
                data={filteredSuppliers}
                keyExtractor={supplierKeyExtractor}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.modalSupplierListContent}
                renderItem={renderModalSupplierItem}
                {...MODAL_SUPPLIER_FLATLIST_TUNING}
                ListEmptyComponent={
                  <Text style={modalEmptyTextStyle}>
                    Ничего не найдено
                  </Text>
                }
              />
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
});

function BuyerItemRowInner(props: {
  it: BuyerInboxRow;
  selected: boolean;
  inSheet?: boolean;
  m: LineMeta;
  sum: number;
  prettyText: string;
  rejectedByDirector: boolean;
  s: StylesBag;
  onTogglePick: () => void;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onPickSupplier: (name: string) => void;
  showInlineEditor?: boolean;
  onFocusField?: () => void;
  onEditMobile?: () => void;
  isMobileEditorOpen?: boolean;
}) {
  const {
    it,
    selected,
    inSheet,
    m,
    sum,
    prettyText,
    rejectedByDirector,
    onTogglePick,
    counterpartyLabel,
    showInlineEditor = false,
    onEditMobile,
    isMobileEditorOpen,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const { user: noteUser } = splitNote(m.note);

  const rejectReason = String(
    it.director_reject_reason ??
    it.director_reject_note ??
    "",
  ).trim();
  const lastOfferSupplier = String(it.last_offer_supplier ?? "").trim();
  const lastOfferPriceRaw = it.last_offer_price;
  const lastOfferPrice =
    typeof lastOfferPriceRaw === "number" && Number.isFinite(lastOfferPriceRaw)
      ? lastOfferPriceRaw
      : null;

  const isEditing = selected && !showInlineEditor && !!isMobileEditorOpen;
  const statusLabel = isEditing ? "Редактируется" : selected ? "Выбрано" : "Заполни и выбери";
  const statusTone = selected ? "info" : "neutral";

  return (
    <View
      style={[
        inSheet ? s.buyerMobCard : s.card,
        inSheet ? null : { backgroundColor: P.cardBg, borderColor: P.border },
        selected && (inSheet ? s.buyerMobCardPicked : s.cardPicked),
        styles.rowShellBase,
        selected ? styles.rowShellSelected : styles.rowShellDefault,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderMain}>
            <View style={styles.rowHeaderTitleRow}>
              <Text style={[s.cardTitle, { color: P.text }]}>{it.name_human}</Text>

              {it.app_code ? (
                <View style={[styles.appCodeChip, { backgroundColor: P.chipGrayBg }]}>
                  <Text style={[styles.appCodeChipText, { color: P.chipGrayText }]}>
                    {it.app_code}
                  </Text>
                </View>
              ) : null}

              {rejectedByDirector ? (
                <View
                  style={[
                    styles.rejectedBadge,
                    {
                      backgroundColor: inSheet ? "rgba(239,68,68,0.18)" : "#FEE2E2",
                      borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                    },
                  ]}
                >
                  <Text style={[styles.rejectedBadgeText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                    ОТКЛОНЕНА
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[s.cardMeta, { color: P.sub }]}>{prettyText}</Text>
          </View>

          <View style={styles.rowHeaderActions}>
            <Pressable
              testID={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              accessibilityLabel={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              onPress={onTogglePick}
              style={[
                s.smallBtn,
                {
                  borderColor: selected ? "#2563eb" : P.btnBorder,
                  backgroundColor: selected ? "#2563eb" : P.btnBg,
                },
                styles.toggleButton,
              ]}
            >
              <Text style={[s.smallBtnText, { color: selected ? "#fff" : P.text }]}>
                {selected ? "Снять" : "Выбрать"}
              </Text>
            </Pressable>
            {!selected ? <Ionicons name="chevron-forward" size={16} color={P.sub} /> : null}
          </View>
        </View>

        <View style={styles.rowMetaBlock}>
          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Цена: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.price || "?"}</Text>
            {" • "}
            {counterpartyLabel}: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.supplier || "?"}</Text>
            {" • "}
            Прим.: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{noteUser || "?"}</Text>
          </Text>

          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Сумма по позиции:{" "}
            <Text style={[styles.rowMetaStrong, { color: P.text }]}>{sum ? sum.toLocaleString() : "0"}</Text> сом
          </Text>

          {rejectedByDirector ? (
            <View
              style={[
                styles.rejectReasonCard,
                {
                  borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                  backgroundColor: inSheet ? "rgba(239,68,68,0.12)" : "#FEF2F2",
                },
              ]}
            >
              <Text style={[styles.rejectReasonText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                Причина отклонения:{" "}
                <Text style={[styles.rejectReasonStrong, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                  {rejectReason || "Отклонено директором"}
                </Text>
              </Text>
              <Text style={[styles.rejectReasonSubline, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                Предыдущее предложение: {lastOfferSupplier || "?"} • {lastOfferPrice != null ? `${lastOfferPrice}` : "?"} сом
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowFooter}>
          {selected ? (
            <Pressable
              onPress={onEditMobile}
              style={styles.mobileEditButton}
            >
              <Text style={styles.mobileEditButtonText}>Редактировать</Text>
            </Pressable>
          ) : null}

          <View style={styles.statusBadgeWrap}>
            <StatusBadge label={statusLabel} tone={statusTone} compact />
          </View>
        </View>
      </View>
    </View>
  );
}

export const BuyerItemRow = React.memo(BuyerItemRowInner, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.inSheet === next.inSheet &&
    prev.sum === next.sum &&
    prev.prettyText === next.prettyText &&
    prev.rejectedByDirector === next.rejectedByDirector &&
    prev.counterpartyLabel === next.counterpartyLabel &&
    prev.hasAnyCounterpartyOptions === next.hasAnyCounterpartyOptions &&
    prev.counterpartyHardFailure === next.counterpartyHardFailure &&
    prev.showInlineEditor === next.showInlineEditor &&
    prev.isMobileEditorOpen === next.isMobileEditorOpen &&
    prev.it?.request_item_id === next.it?.request_item_id &&
    prev.it?.name_human === next.it?.name_human &&
    prev.it?.qty === next.it?.qty &&
    prev.it?.uom === next.it?.uom &&
    prev.it?.app_code === next.it?.app_code &&
    prev.m?.price === next.m?.price &&
    prev.m?.supplier === next.m?.supplier &&
    prev.m?.note === next.m?.note &&
    prev.s === next.s &&
    prev.supplierSuggestions === next.supplierSuggestions
  );
});
