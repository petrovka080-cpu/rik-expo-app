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
import { buyerStyles as styles } from "../buyer.styles";
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
