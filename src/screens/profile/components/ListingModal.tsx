import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { profileStyles } from "../profile.styles";
import type {
  CatalogSearchItem,
  ListingCartItem,
  ListingFormState,
  ProfileListingKind,
} from "../profile.types";
import { LabeledInput } from "./ProfilePrimitives";

const styles = profileStyles;

const LISTING_KIND_OPTIONS: Array<{
  code: ProfileListingKind;
  label: string;
}> = [
  { code: "material", label: "Материалы" },
  { code: "service", label: "Услуги" },
  { code: "rent", label: "Аренда" },
];

const getListingKindLabel = (kind: ListingCartItem["kind"]) => {
  if (kind === "material") return "Материал";
  if (kind === "service") return "Услуга";
  if (kind === "rent") return "Аренда";
  return "";
};

type ListingModalProps = {
  visible: boolean;
  catalogModalOpen: boolean;
  itemModalOpen: boolean;
  listingForm: ListingFormState;
  listingCartItems: ListingCartItem[];
  editingItem: ListingCartItem | null;
  catalogSearch: string;
  catalogResults: CatalogSearchItem[];
  savingListing: boolean;
  catalogLoading: boolean;
  onRequestClose: () => void;
  onPublish: () => void;
  onChangeListingKind: (kind: ProfileListingKind) => void;
  onChangeListingTitle: (value: string) => void;
  onChangeListingDescription: (value: string) => void;
  onChangeListingPhone: (value: string) => void;
  onChangeListingWhatsapp: (value: string) => void;
  onChangeListingEmail: (value: string) => void;
  onInlineCatalogPick: (item: CatalogSearchItem) => void;
  onChangeCatalogSearch: (value: string) => void;
  onLoadCatalog: () => void;
  onCatalogModalClose: () => void;
  onCatalogModalPick: (item: CatalogSearchItem) => void;
  onItemModalClose: () => void;
  onChangeEditingItemCity: (value: string) => void;
  onChangeEditingItemUom: (value: string) => void;
  onChangeEditingItemQty: (value: string) => void;
  onChangeEditingItemPrice: (value: string) => void;
  onConfirmEditingItem: () => void;
};

export function ListingModal({
  visible,
  catalogModalOpen,
  itemModalOpen,
  listingForm,
  listingCartItems,
  editingItem,
  catalogSearch,
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
  onChangeCatalogSearch,
  onLoadCatalog,
  onCatalogModalClose,
  onCatalogModalPick,
  onItemModalClose,
  onChangeEditingItemCity,
  onChangeEditingItemUom,
  onChangeEditingItemQty,
  onChangeEditingItemPrice,
  onConfirmEditingItem,
}: ListingModalProps) {
  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onRequestClose}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalTallCard]}>
            <Text style={styles.modalTitle}>Новое объявление</Text>
            <Text style={styles.modalSub}>
              Сначала задайте заголовок и тип объявления, затем укажите город,
              цену и контакты — после публикации оно сразу появится в витрине и
              на карте.
            </Text>

            <ScrollView
              style={styles.modalScrollTall}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalLabel}>Тип объявления</Text>
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
                label="Позиция (материал / услуга / аренда)"
                value={listingForm.listingTitle}
                onChangeText={onChangeListingTitle}
                placeholder="Например: Газоблок D500, кровля, бетон, бетононасос…"
              />

              <Text style={[styles.listingHelperText, styles.listingHelperTextTight]}>
                Сначала выберите тип объявления выше (Материалы, Услуги или
                Аренда), затем начните вводить позицию — ниже появятся варианты
                из каталога.
              </Text>

              {catalogLoading && listingForm.listingTitle.trim().length >= 2 && (
                <Text style={[styles.listingHelperText, styles.listingHelperTextBottom]}>
                  Ищем в каталоге…
                </Text>
              )}

              {catalogResults.map((item) => (
                <Pressable
                  key={item.rik_code}
                  style={styles.catalogItemRow}
                  onPress={() => onInlineCatalogPick(item)}
                >
                  <Text style={styles.catalogItemTitle}>
                    {item.name_human_ru || "Позиция каталога"}
                  </Text>
                  <Text style={styles.catalogItemMeta}>
                    Ед. изм.: {item.uom_code || "—"} · Тип: {item.kind}
                  </Text>
                </Pressable>
              ))}

              {listingCartItems.length > 0 && (
                <View style={styles.listingCartCard}>
                  <Text style={styles.listingCartTitle}>
                    Позиции в объявлении:
                  </Text>

                  {listingCartItems.map((item, index) => {
                    const kindLabel = getListingKindLabel(item.kind);
                    const lastCartItem = index === listingCartItems.length - 1;

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
                          {kindLabel ? `${kindLabel} · ` : ""}
                          Кол-во: {item.qty} {item.uom || ""} · Цена: {item.price} KGS
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <LabeledInput
                label="Описание"
                value={listingForm.listingDescription}
                onChangeText={onChangeListingDescription}
                placeholder="Кратко опишите материал или услугу, условия доставки и оплаты"
                multiline
                big
              />

              <Text style={styles.modalLabel}>Контакты для связи</Text>

              <LabeledInput
                label="Телефон"
                value={listingForm.listingPhone}
                onChangeText={onChangeListingPhone}
                placeholder="+996…"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label="WhatsApp"
                value={listingForm.listingWhatsapp}
                onChangeText={onChangeListingWhatsapp}
                placeholder="+996…"
                keyboardType="phone-pad"
              />
              <LabeledInput
                label="Email"
                value={listingForm.listingEmail}
                onChangeText={onChangeListingEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                testID="profile-listing-modal-cancel"
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={onRequestClose}
                disabled={savingListing}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                testID="profile-listing-modal-publish"
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={onPublish}
                disabled={savingListing}
              >
                {savingListing ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Опубликовать</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={catalogModalOpen}
        transparent
        animationType="fade"
        onRequestClose={onCatalogModalClose}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalTallCard]}>
            <Text style={styles.modalTitle}>Выбор из каталога</Text>
            <Text style={styles.modalSub}>
              Найдите материал или работу в каталоге и привяжите к объявлению.
            </Text>

            <ScrollView
              style={styles.modalScrollTall}
              contentContainerStyle={styles.modalScrollContent}
            >
              <LabeledInput
                label="Поиск по названию"
                value={catalogSearch}
                onChangeText={onChangeCatalogSearch}
                placeholder="Газоблок, стяжка, кровля…"
              />

              <Pressable
                testID="profile-catalog-modal-search"
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  styles.catalogSearchButton,
                ]}
                onPress={onLoadCatalog}
                disabled={catalogLoading}
              >
                {catalogLoading ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Найти</Text>
                )}
              </Pressable>

              {catalogResults.length === 0 && !catalogLoading && (
                <Text style={styles.catalogEmptyText}>
                  Введите запрос и нажмите «Найти», чтобы увидеть позиции
                  каталога.
                </Text>
              )}

              {catalogResults.map((item) => (
                <Pressable
                  key={item.rik_code}
                  style={styles.catalogItemRow}
                  onPress={() => onCatalogModalPick(item)}
                >
                  <Text style={styles.catalogItemTitle}>
                    {item.name_human_ru || "Позиция каталога"}
                  </Text>
                  <Text style={styles.catalogItemMeta}>
                    Ед. изм.: {item.uom_code || "—"} · Тип: {item.kind}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable
                testID="profile-catalog-modal-close"
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={onCatalogModalClose}
              >
                <Text style={styles.modalBtnSecondaryText}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={itemModalOpen}
        transparent
        animationType="fade"
        onRequestClose={onItemModalClose}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.compactModalCard]}>
            <Text style={styles.modalTitle}>Добавить позицию</Text>
            <Text style={styles.modalSub}>
              Укажите количество и цену для выбранной позиции — она попадёт в
              список товаров объявления.
            </Text>
            {editingItem && (
              <ScrollView
                style={styles.modalScrollItem}
                contentContainerStyle={styles.modalScrollContent}
              >
                <LabeledInput
                  label="Город"
                  value={editingItem.city || ""}
                  onChangeText={onChangeEditingItemCity}
                  placeholder="Бишкек"
                />

                <LabeledInput
                  label="Ед. изм."
                  value={editingItem.uom || ""}
                  onChangeText={onChangeEditingItemUom}
                  placeholder="мешок, м2, м3…"
                />

                <LabeledInput
                  label="Количество"
                  value={editingItem.qty}
                  onChangeText={onChangeEditingItemQty}
                  placeholder="Например: 10"
                  keyboardType="numeric"
                />

                <LabeledInput
                  label="Цена за единицу"
                  value={editingItem.price}
                  onChangeText={onChangeEditingItemPrice}
                  placeholder="Например: 420"
                  keyboardType="numeric"
                />
              </ScrollView>
            )}

            <View style={styles.modalButtonsRow}>
              <Pressable
                testID="profile-item-modal-cancel"
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={onItemModalClose}
              >
                <Text style={styles.modalBtnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                testID="profile-item-modal-confirm"
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={onConfirmEditingItem}
              >
                <Text style={styles.modalBtnPrimaryText}>Добавить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default ListingModal;
