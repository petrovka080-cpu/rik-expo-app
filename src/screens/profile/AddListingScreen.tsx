import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";

import {
  buildAppAccessModel,
  type AppAccessSourceSnapshot,
  type AppContext,
} from "../../lib/appAccessModel";
import { loadStoredActiveContext } from "../../lib/appAccessContextStorage";
import {
  buildSupplierShowcaseRoute,
  MARKET_TAB_ROUTE,
  SELLER_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { profileStyles } from "./profile.styles";
import {
  createMarketListing,
  loadAddListingOwnerData,
  searchCatalogItems,
} from "./profile.services";
import type {
  CatalogSearchItem,
  Company,
  ListingCartItem,
  ListingKind,
  UserProfile,
} from "./profile.types";
import { ListingModal } from "./components/ListingModal";
import { useListingForm } from "./hooks/useListingForm";

const styles = profileStyles;

const UI_COPY = {
  loadingLabel: "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f\u2026",
  alertTitle: "\u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435",
  catalogFallback: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
  kindHintTitle: "\u0422\u0438\u043f \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043e\u043a",
  kindHintMessage:
    "\u0412 \u044d\u0442\u043e\u043c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0438 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u0438. \u0422\u0438\u043f \u043d\u0430\u0432\u0435\u0440\u0445\u0443 \u0432\u043b\u0438\u044f\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.",
  selectKindTitle: "\u0422\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  selectKindMessage:
    "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f: \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b, \u0443\u0441\u043b\u0443\u0433\u0438 \u0438\u043b\u0438 \u0430\u0440\u0435\u043d\u0434\u0430.",
  itemValidationTitle: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  itemValidationMessage:
    "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e, \u0438 \u0446\u0435\u043d\u0443 \u0437\u0430 \u0435\u0434\u0438\u043d\u0438\u0446\u0443.",
  missingTitle: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f.",
  missingContacts:
    "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043a\u043e\u043d\u0442\u0430\u043a\u0442: \u0442\u0435\u043b\u0435\u0444\u043e\u043d, WhatsApp \u0438\u043b\u0438 email.",
  locationTitle: "\u0413\u0435\u043e\u043b\u043e\u043a\u0430\u0446\u0438\u044f",
  locationPermissionMessage:
    "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044e, \u0447\u0442\u043e\u0431\u044b \u0440\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.",
  locationFailedMessage:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  locationMissingCoordsMessage:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043a\u043e\u043e\u0440\u0434\u0438\u043d\u0430\u0442\u044b. \u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435 \u0431\u0443\u0434\u0435\u0442 \u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e.",
  successTitle: "\u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e",
  successMessage:
    "\u0412\u0430\u0448\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u0443\u0436\u0435 \u0432\u0438\u0434\u043d\u043e \u0432 \u0432\u0438\u0442\u0440\u0438\u043d\u0435 \u0438 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.",
  openShowcaseAction: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0438\u0442\u0440\u0438\u043d\u0443",
  okAction: "\u041e\u043a",
} as const;

const normalizeLegacyAddListingError = (message: string): string => {
  if (!message.trim()) {
    return "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
  }
  if (message === "profile_error") {
    return "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
  }
  if (message.includes("\u0420\u045a\u0420\u00b5 \u0420\u0405\u0420\u00b0\u0420\u2116\u0421\u2018\u0420\u00b5\u0420\u0405")) {
    return "\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c";
  }
  if (message.includes("\u0420\u00a6\u0420\u00b5\u0420\u0405\u0420\u00b0")) {
    return "\u0426\u0435\u043d\u0430 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e.";
  }
  return message;
};

const getAddListingErrorMessage = (error: unknown): string =>
  normalizeLegacyAddListingError(
    error instanceof Error ? error.message : String(error ?? "profile_error"),
  );

export function AddListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry?: string | string[] }>();
  const entrySource = Array.isArray(params.entry)
    ? params.entry[0]
    : params.entry;
  const returnRoute =
    entrySource === "seller" ? SELLER_ROUTE : MARKET_TAB_ROUTE;

  const [loading, setLoading] = useState(true);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [accessSourceSnapshot, setAccessSourceSnapshot] =
    useState<AppAccessSourceSnapshot | null>(null);
  const [storedActiveContext, setStoredActiveContext] =
    useState<AppContext | null>(null);

  const {
    listingForm,
    listingCartItems,
    setListingCartItems,
    editingItem,
    setEditingItem,
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
    listingEmail,
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
        const result = await loadAddListingOwnerData();
        const nextStoredActiveContext = await loadStoredActiveContext(
          result.profile.user_id,
        );
        if (!alive) return;

        const nextAccessSnapshot = result.accessSourceSnapshot;
        const accessModel = buildAppAccessModel({
          ...nextAccessSnapshot,
          requestedActiveContext: nextStoredActiveContext,
        });

        setProfile(result.profile);
        setCompany(result.company);
        setAccessSourceSnapshot(nextAccessSnapshot);
        setStoredActiveContext(nextStoredActiveContext);
        prepareListingForm({
          profile: result.profile,
          company: result.company,
          activeContext: accessModel.activeContext,
        });
      } catch (error: unknown) {
        if (!alive) return;
        Alert.alert(UI_COPY.alertTitle, getAddListingErrorMessage(error));
        router.replace(returnRoute);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadAll();

    return () => {
      alive = false;
    };
  }, [prepareListingForm, returnRoute, router]);

  const accessModel = useMemo(
    () =>
      buildAppAccessModel({
        userId: profile?.user_id ?? null,
        authRole: accessSourceSnapshot?.authRole ?? null,
        resolvedRole: accessSourceSnapshot?.resolvedRole ?? null,
        usageMarket:
          accessSourceSnapshot?.usageMarket ?? Boolean(profile?.usage_market),
        usageBuild:
          accessSourceSnapshot?.usageBuild ?? Boolean(profile?.usage_build),
        ownedCompanyId: accessSourceSnapshot?.ownedCompanyId ?? company?.id ?? null,
        companyMemberships: accessSourceSnapshot?.companyMemberships ?? [],
        listingsCount: accessSourceSnapshot?.listingsCount ?? 0,
        requestedActiveContext: storedActiveContext,
      }),
    [
      accessSourceSnapshot,
      company?.id,
      profile?.usage_build,
      profile?.usage_market,
      profile?.user_id,
      storedActiveContext,
    ],
  );

  const resetAndExitAddListingFlow = useCallback(() => {
    if (profile) {
      prepareListingForm({
        profile,
        company,
        activeContext: accessModel.activeContext,
      });
    }
    setItemModalOpen(false);
    setEditingItem(null);
    setCatalogResults([]);
    router.replace(returnRoute);
  }, [
    accessModel.activeContext,
    company,
    prepareListingForm,
    profile,
    returnRoute,
    router,
    setCatalogResults,
    setEditingItem,
  ]);

  const closeItemModal = () => {
    setItemModalOpen(false);
    setEditingItem(null);
  };

  const buildListingCatalogItem = (
    item: CatalogSearchItem,
  ): ListingCartItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    rik_code: item.rik_code,
    name: item.name_human_ru || UI_COPY.catalogFallback,
    uom: item.uom_code || "",
    qty: "",
    price: "",
    city: listingCity || profile?.city || company?.city || null,
    kind: listingKind ?? null,
  });

  const handleListingKindChange = (nextKind: ListingKind) => {
    if (
      listingCartItems.length > 0 &&
      listingKind &&
      listingKind !== nextKind
    ) {
      Alert.alert(UI_COPY.kindHintTitle, UI_COPY.kindHintMessage);
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
    } catch (error: unknown) {
      if (__DEV__) console.warn(
        "searchCatalogInline error:",
        getAddListingErrorMessage(error),
      );
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleListingTitleChange = (text: string) => {
    setListingTitle(text);
    setListingRikCode(null);
    setListingUom("");
    void searchCatalogInline(text);
  };

  const handleInlineCatalogPick = (item: CatalogSearchItem) => {
    if (!listingKind) {
      Alert.alert(UI_COPY.selectKindTitle, UI_COPY.selectKindMessage);
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
      Alert.alert(UI_COPY.itemValidationTitle, UI_COPY.itemValidationMessage);
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
    if (!profile || savingListing) return;
    if (!listingTitle.trim()) {
      Alert.alert(UI_COPY.alertTitle, UI_COPY.missingTitle);
      return;
    }

    if (!listingKind) {
      Alert.alert(UI_COPY.selectKindTitle, UI_COPY.selectKindMessage);
      return;
    }

    try {
      setSavingListing(true);

      if (
        !listingPhone.trim() &&
        !listingWhatsapp.trim() &&
        !listingEmail.trim()
      ) {
        Alert.alert(UI_COPY.alertTitle, UI_COPY.missingContacts);
        return;
      }

      let lat: number | null = null;
      let lng: number | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(UI_COPY.locationTitle, UI_COPY.locationPermissionMessage);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      } catch {
        Alert.alert(UI_COPY.locationTitle, UI_COPY.locationFailedMessage);
        return;
      }

      if (lat == null || lng == null) {
        Alert.alert(UI_COPY.locationTitle, UI_COPY.locationMissingCoordsMessage);
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

      resetAndExitAddListingFlow();

      Alert.alert(UI_COPY.successTitle, UI_COPY.successMessage, [
        {
          text: UI_COPY.openShowcaseAction,
          onPress: () => router.push(buildSupplierShowcaseRoute()),
        },
        { text: UI_COPY.okAction, style: "cancel" },
      ]);
    } catch (error: unknown) {
      Alert.alert(UI_COPY.alertTitle, getAddListingErrorMessage(error));
    } finally {
      setSavingListing(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>{UI_COPY.loadingLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ListingModal
        visible
        itemModalOpen={itemModalOpen}
        listingForm={listingForm}
        listingCartItems={listingCartItems}
        editingItem={editingItem}
        catalogResults={catalogResults}
        savingListing={savingListing}
        catalogLoading={catalogLoading}
        onRequestClose={resetAndExitAddListingFlow}
        onPublish={publishListing}
        onChangeListingKind={handleListingKindChange}
        onChangeListingTitle={handleListingTitleChange}
        onChangeListingDescription={setListingDescription}
        onChangeListingPhone={setListingPhone}
        onInlineCatalogPick={handleInlineCatalogPick}
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
