import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

import {
  buildAppAccessModel,
  type AppAccessSourceSnapshot,
} from "../../lib/appAccessModel";
import { loadStoredActiveContext } from "../../lib/appAccessContextStorage";
import {
  buildSupplierShowcaseRoute,
  MARKET_TAB_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { getErrorMessage } from "./profile.helpers";
import { profileStyles } from "./profile.styles";
import {
  createMarketListing,
  loadCatalogItems,
  loadProfileScreenData,
  searchCatalogItems,
} from "./profile.services";
import type {
  CatalogSearchItem,
  Company,
  ListingCartItem,
  UserProfile,
} from "./profile.types";
import { ListingModal } from "./components/ListingModal";
import { useListingForm } from "./hooks/useListingForm";

const styles = profileStyles;

export function AddListingScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [accessSourceSnapshot, setAccessSourceSnapshot] =
    useState<AppAccessSourceSnapshot | null>(null);
  const [requestedActiveContext, setRequestedActiveContext] = useState<
    "market" | "office" | null
  >(null);

  const {
    listingForm,
    listingCartItems,
    setListingCartItems,
    editingItem,
    setEditingItem,
    catalogSearch,
    setCatalogSearch,
    catalogResults,
    setCatalogResults,
    catalogLoading,
    setCatalogLoading,
    prepareListingForm,
    listingTitle,
    setListingTitle,
    listingCity,
    setListingCity,
    listingPrice,
    listingUom,
    setListingUom,
    listingDescription,
    setListingDescription,
    listingPhone,
    setListingPhone,
    listingWhatsapp,
    setListingWhatsapp,
    listingEmail,
    setListingEmail,
    listingKind,
    setListingKind,
    listingRikCode,
    setListingRikCode,
  } = useListingForm();

  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      try {
        setLoading(true);
        const result = await loadProfileScreenData();
        const storedActiveContext = await loadStoredActiveContext(result.profile.user_id);
        if (!alive) return;

        const nextAccessSnapshot = result.accessSourceSnapshot;
        const accessModel = buildAppAccessModel({
          ...nextAccessSnapshot,
          requestedActiveContext: storedActiveContext,
        });

        setProfile(result.profile);
        setCompany(result.company);
        setAccessSourceSnapshot(nextAccessSnapshot);
        setRequestedActiveContext(storedActiveContext);
        prepareListingForm({
          profile: result.profile,
          company: result.company,
          activeContext: accessModel.activeContext,
        });
        setListingModalOpen(true);
      } catch (e: unknown) {
        if (!alive) return;
        Alert.alert("Объявление", getErrorMessage(e));
        router.replace(MARKET_TAB_ROUTE);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadAll();

    return () => {
      alive = false;
    };
  }, [prepareListingForm, router]);

  const accessModel = useMemo(
    () =>
      buildAppAccessModel({
        userId: profile?.user_id ?? null,
        authRole: accessSourceSnapshot?.authRole ?? null,
        resolvedRole: accessSourceSnapshot?.resolvedRole ?? null,
        usageMarket: accessSourceSnapshot?.usageMarket ?? Boolean(profile?.usage_market),
        usageBuild: accessSourceSnapshot?.usageBuild ?? Boolean(profile?.usage_build),
        ownedCompanyId: accessSourceSnapshot?.ownedCompanyId ?? company?.id ?? null,
        companyMemberships: accessSourceSnapshot?.companyMemberships ?? [],
        listingsCount: accessSourceSnapshot?.listingsCount ?? 0,
        requestedActiveContext,
      }),
    [accessSourceSnapshot, company?.id, profile?.usage_build, profile?.usage_market, profile?.user_id, requestedActiveContext],
  );

  const closeListingModal = () => {
    setListingModalOpen(false);
    router.replace(MARKET_TAB_ROUTE);
  };

  const closeCatalogModal = () => {
    setCatalogModalOpen(false);
  };

  const closeItemModal = () => {
    setItemModalOpen(false);
    setEditingItem(null);
  };

  const buildListingCatalogItem = (
    item: CatalogSearchItem,
  ): ListingCartItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    rik_code: item.rik_code,
    name: item.name_human_ru || "Позиция каталога",
    uom: item.uom_code || "",
    qty: "",
    price: "",
    city: listingCity || profile?.city || company?.city || null,
    kind: listingKind ?? null,
  });

  const handleListingKindChange = (
    nextKind: "material" | "service" | "rent",
  ) => {
    if (
      listingCartItems.length > 0 &&
      listingKind &&
      listingKind !== nextKind
    ) {
      Alert.alert(
        "Тип подсказок",
        "В этом объявлении уже есть позиции. Тип наверху влияет только на подсказки из каталога.",
      );
    }

    setListingKind(nextKind);
  };

  const searchCatalogInline = async (term: string) => {
    const query = term.trim();
    if (query.length < 2) {
      setCatalogResults([]);
      return;
    }

    try {
      setCatalogLoading(true);
      const results = await searchCatalogItems(query, listingKind);
      setCatalogResults(results);
    } catch (e: unknown) {
      console.warn("searchCatalogInline error:", getErrorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleListingTitleChange = (text: string) => {
    setListingTitle(text);
    setListingRikCode(null);
    setListingUom("");
    setCatalogSearch(text);
    void searchCatalogInline(text);
  };

  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const results = await loadCatalogItems(catalogSearch, listingKind);
      setCatalogResults(results);
    } catch (e: unknown) {
      Alert.alert("Каталог", getErrorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleInlineCatalogPick = (item: CatalogSearchItem) => {
    if (!listingKind) {
      Alert.alert(
        "Тип объявления",
        "Сначала выберите тип объявления: материалы, услуги или аренда.",
      );
      return;
    }

    const base = buildListingCatalogItem(item);
    setListingRikCode(base.rik_code);
    setListingTitle(base.name);
    setListingUom(base.uom || "");
    setEditingItem(base);
    setItemModalOpen(true);
    setCatalogResults([]);
  };

  const handleCatalogModalPick = (item: CatalogSearchItem) => {
    if (!listingKind) {
      Alert.alert(
        "Тип объявления",
        "Сначала выберите тип объявления: материалы, услуги или аренда.",
      );
      return;
    }

    const base = buildListingCatalogItem(item);
    setListingRikCode(base.rik_code);
    setListingTitle(base.name);
    setListingUom(base.uom || "");
    setEditingItem(base);
    setItemModalOpen(true);
    setCatalogModalOpen(false);
    setCatalogResults([]);
  };

  const handleEditingItemCityChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, city: value } : prev));
  };

  const handleEditingItemUomChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, uom: value } : prev));
  };

  const handleEditingItemQtyChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, qty: value } : prev));
  };

  const handleEditingItemPriceChange = (value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, price: value } : prev));
  };

  const handleEditingItemConfirm = () => {
    if (!editingItem) return;
    if (!editingItem.qty.trim() || !editingItem.price.trim()) {
      Alert.alert(
        "Позиция",
        "Укажите и количество, и цену за единицу.",
      );
      return;
    }

    if (!listingCity && editingItem.city) {
      setListingCity(editingItem.city);
    }

    setListingCartItems((prev) => [...prev, editingItem]);
    setItemModalOpen(false);
    setEditingItem(null);
  };

  const publishListing = async () => {
    if (!profile) return;
    if (!listingTitle.trim()) {
      Alert.alert("Объявление", "Укажите заголовок объявления.");
      return;
    }

    if (!listingKind) {
      Alert.alert(
        "Объявление",
        "Выберите тип объявления: материалы, услуги или аренда.",
      );
      return;
    }

    try {
      setSavingListing(true);

      if (!listingPhone.trim() && !listingWhatsapp.trim() && !listingEmail.trim()) {
        Alert.alert(
          "Объявление",
          "Укажите хотя бы один контакт: телефон, WhatsApp или email.",
        );
        return;
      }

      let lat: number | null = null;
      let lng: number | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Геолокация",
          "Разрешите доступ к местоположению, чтобы разместить объявление на карте.",
        );
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      } catch {
        Alert.alert(
          "Геолокация",
          "Не удалось автоматически определить местоположение. Попробуйте ещё раз.",
        );
        return;
      }

      if (lat == null || lng == null) {
        Alert.alert(
          "Геолокация",
          "Не удалось получить координаты. Объявление не будет размещено.",
        );
        return;
      }

      await createMarketListing({
        userId: profile.user_id,
        companyId:
          accessModel.activeContext === "office" && company ? company.id : null,
        form: {
          listingTitle,
          listingCity,
          listingPrice,
          listingUom,
          listingDescription,
          listingPhone,
          listingWhatsapp,
          listingEmail,
          listingKind,
          listingRikCode,
        },
        listingCartItems,
        lat,
        lng,
      });

      setListingModalOpen(false);
      router.replace(MARKET_TAB_ROUTE);

      Alert.alert(
        "Объявление опубликовано",
        "Ваше объявление уже видно в витрине и на карте.",
        [
          {
            text: "Открыть витрину",
            onPress: () => router.push(buildSupplierShowcaseRoute()),
          },
          { text: "Ок", style: "cancel" },
        ],
      );
    } catch (e: unknown) {
      Alert.alert("Объявление", getErrorMessage(e));
    } finally {
      setSavingListing(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Подготавливаем публикацию…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ListingModal
        visible={listingModalOpen}
        catalogModalOpen={catalogModalOpen}
        itemModalOpen={itemModalOpen}
        listingForm={listingForm}
        listingCartItems={listingCartItems}
        editingItem={editingItem}
        catalogSearch={catalogSearch}
        catalogResults={catalogResults}
        savingListing={savingListing}
        catalogLoading={catalogLoading}
        onRequestClose={closeListingModal}
        onPublish={publishListing}
        onChangeListingKind={handleListingKindChange}
        onChangeListingTitle={handleListingTitleChange}
        onChangeListingDescription={setListingDescription}
        onChangeListingPhone={setListingPhone}
        onChangeListingWhatsapp={setListingWhatsapp}
        onChangeListingEmail={setListingEmail}
        onInlineCatalogPick={handleInlineCatalogPick}
        onChangeCatalogSearch={setCatalogSearch}
        onLoadCatalog={loadCatalog}
        onCatalogModalClose={closeCatalogModal}
        onCatalogModalPick={handleCatalogModalPick}
        onItemModalClose={closeItemModal}
        onChangeEditingItemCity={handleEditingItemCityChange}
        onChangeEditingItemUom={handleEditingItemUomChange}
        onChangeEditingItemQty={handleEditingItemQtyChange}
        onChangeEditingItemPrice={handleEditingItemPriceChange}
        onConfirmEditingItem={handleEditingItemConfirm}
      />
    </View>
  );
}

export default AddListingScreen;
