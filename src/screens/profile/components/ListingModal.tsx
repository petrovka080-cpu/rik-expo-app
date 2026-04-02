import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { profileStyles } from "../profile.styles";
import React19SafeModal from "../../../ui/React19SafeModal";
import type {
  CatalogSearchItem,
  ListingCartItem,
  ListingFormState,
  ListingKind,
} from "../profile.types";
import { LabeledInput } from "./ProfilePrimitives";

const styles = profileStyles;

const UI_COPY = {
  modalTitle: "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  modalSub:
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f, \u043d\u0430\u0447\u043d\u0438\u0442\u0435 \u0432\u0432\u043e\u0434\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0443 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430. \u0414\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u0433\u043e\u0440\u043e\u0434, \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438 \u0446\u0435\u043d\u0443, \u0437\u0430\u0442\u0435\u043c \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u044b.",
  kindLabel: "\u0422\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  titleLabel: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  titlePlaceholder:
    "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0413\u0430\u0437\u043e\u0431\u043b\u043e\u043a D500, \u043a\u0440\u043e\u0432\u043b\u044f, \u0431\u0435\u0442\u043e\u043d, \u0431\u0435\u0442\u043e\u043d\u043e\u043d\u0430\u0441\u043e\u0441\u2026",
  helperText:
    "\u041f\u043e\u0441\u043b\u0435 \u0432\u044b\u0431\u043e\u0440\u0430 \u0442\u0438\u043f\u0430 \u043d\u0430\u0447\u043d\u0438\u0442\u0435 \u0432\u0432\u043e\u0434\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e. \u041d\u0438\u0436\u0435 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.",
  loadingCatalog: "\u0418\u0449\u0435\u043c \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435\u2026",
  catalogFallback: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
  catalogUomLabel: "\u0415\u0434. \u0438\u0437\u043c.",
  catalogKindLabel: "\u0422\u0438\u043f",
  noValue: "\u2014",
  addedItemsTitle: "\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u0438",
  qtyLabel: "\u041a\u043e\u043b-\u0432\u043e",
  priceLabel: "\u0426\u0435\u043d\u0430",
  descriptionLabel: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
  descriptionPlaceholder:
    "\u041a\u0440\u0430\u0442\u043a\u043e \u043e\u043f\u0438\u0448\u0438\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u043b\u0438 \u0443\u0441\u043b\u0443\u0433\u0443, \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u0438 \u043e\u043f\u043b\u0430\u0442\u044b",
  contactsLabel: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u0434\u043b\u044f \u0441\u0432\u044f\u0437\u0438",
  phoneLabel: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
  whatsappLabel: "WhatsApp",
  emailLabel: "Email",
  cancelAction: "\u041e\u0442\u043c\u0435\u043d\u0430",
  publishAction: "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c",
  itemModalTitle: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u043f\u043e\u0437\u0438\u0446\u0438\u0438",
  itemModalSub:
    "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0433\u043e\u0440\u043e\u0434, \u0435\u0434\u0438\u043d\u0438\u0446\u0443 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f, \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438 \u0446\u0435\u043d\u0443 \u0437\u0430 \u0435\u0434\u0438\u043d\u0438\u0446\u0443 \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438.",
  cityLabel: "\u0413\u043e\u0440\u043e\u0434",
  cityPlaceholder: "\u0411\u0438\u0448\u043a\u0435\u043a",
  uomLabel: "\u0415\u0434. \u0438\u0437\u043c.",
  uomPlaceholder: "\u043c\u0435\u0448\u043e\u043a, \u043c2, \u043c3\u2026",
  qtyInputLabel: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e",
  qtyPlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: 10",
  priceInputLabel: "\u0426\u0435\u043d\u0430 \u0437\u0430 \u0435\u0434\u0438\u043d\u0438\u0446\u0443",
  pricePlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: 420",
  addAction: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
} as const;

const LISTING_KIND_OPTIONS: Array<{
  code: ListingKind;
  label: string;
}> = [
  { code: "material", label: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b" },
  { code: "service", label: "\u0423\u0441\u043b\u0443\u0433\u0438" },
  { code: "rent", label: "\u0410\u0440\u0435\u043d\u0434\u0430" },
];

const getListingKindLabel = (kind: ListingCartItem["kind"]) => {
  if (kind === "material") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b";
  if (kind === "service") return "\u0423\u0441\u043b\u0443\u0433\u0430";
  if (kind === "rent") return "\u0410\u0440\u0435\u043d\u0434\u0430";
  return "";
};

type ListingModalProps = {
  visible: boolean;
  itemModalOpen: boolean;
  listingForm: ListingFormState;
  listingCartItems: ListingCartItem[];
  editingItem: ListingCartItem | null;
  catalogResults: CatalogSearchItem[];
  savingListing: boolean;
  catalogLoading: boolean;
  onRequestClose: () => void;
  onPublish: () => void;
  onChangeListingKind: (kind: ListingKind) => void;
  onChangeListingTitle: (value: string) => void;
  onChangeListingDescription: (value: string) => void;
  onChangeListingPhone: (value: string) => void;
  onChangeListingWhatsapp: (value: string) => void;
  onChangeListingEmail: (value: string) => void;
  onInlineCatalogPick: (item: CatalogSearchItem) => void;
  onItemModalClose: () => void;
  onChangeEditingItemCity: (value: string) => void;
  onChangeEditingItemUom: (value: string) => void;
  onChangeEditingItemQty: (value: string) => void;
  onChangeEditingItemPrice: (value: string) => void;
  onConfirmEditingItem: () => void;
};

export function ListingModal({
  visible,
  itemModalOpen,
  listingForm,
  listingCartItems,
  editingItem,
  catalogResults,
  savingListing,
  catalogLoading,
  onRequestClose,
  onPublish,
  onChangeListingKind,
  onChangeListingTitle,
  onChangeListingDescription,
  onChangeListingPhone,
  onChangeListingWhatsapp,
  onChangeListingEmail,
  onInlineCatalogPick,
  onItemModalClose,
  onChangeEditingItemCity,
  onChangeEditingItemUom,
  onChangeEditingItemQty,
  onChangeEditingItemPrice,
  onConfirmEditingItem,
}: ListingModalProps) {
  return (
    <>
      <React19SafeModal
        isVisible={visible}
        onBackdropPress={onRequestClose}
        onBackButtonPress={onRequestClose}
        backdropOpacity={0.55}
        hideModalContentWhileAnimating
        style={styles.listingModalHost}
      >
        <View
          style={[styles.modalCard, styles.modalTallCard]}
          testID="add-listing-owner-shell"
        >
          <Text style={styles.modalTitle}>{UI_COPY.modalTitle}</Text>
          <Text style={styles.modalSub}>{UI_COPY.modalSub}</Text>

          <View style={styles.modalBodySection}>
            <ScrollView
              style={styles.modalScrollTall}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalLabel}>{UI_COPY.kindLabel}</Text>
              <View style={styles.listingKindRow}>
                {LISTING_KIND_OPTIONS.map((option) => {
                  const active = listingForm.listingKind === option.code;
                  return (
                    <Pressable
                      key={option.code}
                      onPress={() => onChangeListingKind(option.code)}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <LabeledInput
                label={UI_COPY.titleLabel}
                value={listingForm.listingTitle}
                onChangeText={onChangeListingTitle}
                placeholder={UI_COPY.titlePlaceholder}
              />

              <Text
                style={[
                  styles.listingHelperText,
                  styles.listingHelperTextTight,
                ]}
              >
                {UI_COPY.helperText}
              </Text>

              {catalogLoading && listingForm.listingTitle.trim().length >= 2 && (
                <Text
                  style={[
                    styles.listingHelperText,
                    styles.listingHelperTextBottom,
                  ]}
                >
                  {UI_COPY.loadingCatalog}
                </Text>
              )}

              {catalogResults.map((item) => (
                <Pressable
                  key={item.rik_code}
                  style={styles.catalogItemRow}
                  onPress={() => onInlineCatalogPick(item)}
                >
                  <Text style={styles.catalogItemTitle}>
                    {item.name_human_ru || UI_COPY.catalogFallback}
                  </Text>
                  <Text style={styles.catalogItemMeta}>
                    {`${UI_COPY.catalogUomLabel}: ${item.uom_code || UI_COPY.noValue} \u00b7 ${UI_COPY.catalogKindLabel}: ${item.kind}`}
                  </Text>
                </Pressable>
              ))}

              {listingCartItems.length > 0 && (
                <View style={styles.listingCartCard}>
                  <Text style={styles.listingCartTitle}>
                    {UI_COPY.addedItemsTitle}
                  </Text>

                  {listingCartItems.map((item, index) => {
                    const kindLabel = getListingKindLabel(item.kind);
                    const lastCartItem = index === listingCartItems.length - 1;
                    const prefix = kindLabel ? `${kindLabel} \u00b7 ` : "";

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.listingCartItem,
                          lastCartItem && styles.listingCartItemLast,
                        ]}
                      >
                        <Text style={styles.listingCartItemTitle}>
                          {item.name}
                        </Text>
                        <Text style={styles.listingCartItemMeta}>
                          {`${prefix}${UI_COPY.qtyLabel}: ${item.qty} ${item.uom || ""} \u00b7 ${UI_COPY.priceLabel}: ${item.price} KGS`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <LabeledInput
                label={UI_COPY.descriptionLabel}
                value={listingForm.listingDescription}
                onChangeText={onChangeListingDescription}
                placeholder={UI_COPY.descriptionPlaceholder}
                multiline
                big
              />

              <Text style={styles.modalLabel}>{UI_COPY.contactsLabel}</Text>

              <LabeledInput
                label={UI_COPY.phoneLabel}
                value={listingForm.listingPhone}
                onChangeText={onChangeListingPhone}
                placeholder="+996\u2026"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label={UI_COPY.whatsappLabel}
                value={listingForm.listingWhatsapp}
                onChangeText={onChangeListingWhatsapp}
                placeholder="+996\u2026"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label={UI_COPY.emailLabel}
                value={listingForm.listingEmail}
                onChangeText={onChangeListingEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
              />
            </ScrollView>
          </View>

          <View style={styles.modalButtonsRow}>
            <Pressable
              testID="add-listing-flow-close"
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={onRequestClose}
              disabled={savingListing}
            >
              <Text style={styles.modalBtnSecondaryText}>
                {UI_COPY.cancelAction}
              </Text>
            </Pressable>
            <Pressable
              testID="add-listing-flow-publish"
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={onPublish}
              disabled={savingListing}
            >
              {savingListing ? (
                <ActivityIndicator color="#0B1120" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>
                  {UI_COPY.publishAction}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </React19SafeModal>

      <React19SafeModal
        isVisible={itemModalOpen}
        onBackdropPress={onItemModalClose}
        onBackButtonPress={onItemModalClose}
        backdropOpacity={0.55}
        hideModalContentWhileAnimating
        style={styles.listingModalHost}
      >
        <View
          style={[styles.modalCard, styles.compactModalCard]}
          testID="add-listing-item-modal"
        >
          <Text style={styles.modalTitle}>{UI_COPY.itemModalTitle}</Text>
          <Text style={styles.modalSub}>{UI_COPY.itemModalSub}</Text>
          {editingItem && (
            <View style={styles.modalBodySection}>
              <ScrollView
                style={styles.modalScrollItem}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <LabeledInput
                  label={UI_COPY.cityLabel}
                  value={editingItem.city || ""}
                  onChangeText={onChangeEditingItemCity}
                  placeholder={UI_COPY.cityPlaceholder}
                />

                <LabeledInput
                  label={UI_COPY.uomLabel}
                  value={editingItem.uom || ""}
                  onChangeText={onChangeEditingItemUom}
                  placeholder={UI_COPY.uomPlaceholder}
                />

                <LabeledInput
                  label={UI_COPY.qtyInputLabel}
                  value={editingItem.qty}
                  onChangeText={onChangeEditingItemQty}
                  placeholder={UI_COPY.qtyPlaceholder}
                  keyboardType="numeric"
                />

                <LabeledInput
                  label={UI_COPY.priceInputLabel}
                  value={editingItem.price}
                  onChangeText={onChangeEditingItemPrice}
                  placeholder={UI_COPY.pricePlaceholder}
                  keyboardType="numeric"
                />
              </ScrollView>
            </View>
          )}
          <View style={styles.modalButtonsRow}>
            <Pressable
              testID="add-listing-item-cancel"
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={onItemModalClose}
            >
              <Text style={styles.modalBtnSecondaryText}>
                {UI_COPY.cancelAction}
              </Text>
            </Pressable>
            <Pressable
              testID="add-listing-item-confirm"
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={onConfirmEditingItem}
            >
              <Text style={styles.modalBtnPrimaryText}>
                {UI_COPY.addAction}
              </Text>
            </Pressable>
          </View>
        </View>
      </React19SafeModal>
    </>
  );
}

export default ListingModal;
