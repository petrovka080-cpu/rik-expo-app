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
import {
  CatalogSearchItem,
  Company,
  getAddListingErrorMessage,
  ListingCartItem,
  ListingKind,
  UI_COPY,
  UserProfile,
} from "./profile.types";
import {
  ListingModal,
  type AddListingPublishStatus,
  type AddListingValidationErrors,
} from "./components/ListingModal";
import { useListingForm } from "./hooks/useListingForm";
import {
  showMarketplacePhotoUploadError,
  uploadMarketplaceProductMedia,
  uploadMarketplaceProductPhoto,
} from "./profile.marketplaceMedia";

const styles = profileStyles;
const MIN_PHONE_DIGITS = 7;

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function parsePositiveListingPrice(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasValidationErrors(errors: AddListingValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function firstValidationError(errors: AddListingValidationErrors): string | null {
  return Object.values(errors).find((value) => Boolean(value)) ?? null;
}

function buildAddListingValidationErrors(params: {
  listingTitle: string;
  listingKind: ListingKind | null;
  marketplaceMediaAssetIds: readonly string[];
  listingDescription: string;
  listingCity: string;
  listingPrice: string;
  listingPhone: string;
}): AddListingValidationErrors {
  const errors: AddListingValidationErrors = {};

  if (!params.listingKind) {
    errors.listingKind = UI_COPY.selectKindMessage;
  }
  if (!params.listingTitle.trim()) {
    errors.listingTitle = UI_COPY.missingTitle;
  }
  if (params.marketplaceMediaAssetIds.length < 1) {
    errors.media = UI_COPY.missingMedia;
  }
  if (!params.listingDescription.trim()) {
    errors.listingDescription = UI_COPY.missingDescription;
  }
  if (!params.listingCity.trim()) {
    errors.listingCity = UI_COPY.missingCity;
  }
  if (!params.listingPrice.trim()) {
    errors.listingPrice = UI_COPY.missingPrice;
  } else if (parsePositiveListingPrice(params.listingPrice) == null) {
    errors.listingPrice = "Укажите цену больше нуля.";
  }
  if (!params.listingPhone.trim()) {
    errors.listingPhone = "Укажите телефон для связи.";
  } else if (normalizePhoneDigits(params.listingPhone).length < MIN_PHONE_DIGITS) {
    errors.listingPhone = "Проверьте номер телефона.";
  }

  return errors;
}

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
  const [marketplaceMediaAssetIds, setMarketplaceMediaAssetIds] = useState<string[]>([]);
  const [marketplaceMediaAssets, setMarketplaceMediaAssets] = useState<{
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[]>([]);
  const [publishStatus, setPublishStatus] =
    useState<AddListingPublishStatus>("idle");
  const [validationErrors, setValidationErrors] =
    useState<AddListingValidationErrors>({});
  const [publishedListingId, setPublishedListingId] =
    useState<string | null>(null);

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
    setListingPrice,
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

  const clearValidationError = useCallback((field: keyof AddListingValidationErrors) => {
    setValidationErrors((prev) => {
      if (!prev[field] && !prev.submit) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.submit;
      return next;
    });
    setPublishStatus((current) =>
      current === "failed_retryable" || current === "failed_final" ? "idle" : current,
    );
    setPublishedListingId(null);
  }, []);

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
    setMarketplaceMediaAssetIds([]);
    setMarketplaceMediaAssets([]);
    setValidationErrors({});
    setPublishStatus("idle");
    setPublishedListingId(null);
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
    clearValidationError("listingKind");
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
    clearValidationError("listingTitle");
    void searchCatalogInline(text);
  };

  const handleListingCityChange = (text: string) => {
    setListingCity(text);
    clearValidationError("listingCity");
  };

  const handleListingPriceChange = (text: string) => {
    setListingPrice(text);
    clearValidationError("listingPrice");
  };

  const handleListingDescriptionChange = (text: string) => {
    setListingDescription(text);
    clearValidationError("listingDescription");
  };

  const handleListingPhoneChange = (text: string) => {
    setListingPhone(text);
    clearValidationError("listingPhone");
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

  const handlePickMarketplacePhoto = useCallback(async () => {
    if (!profile) return null;
    try {
      return await uploadMarketplaceProductPhoto({
        userId: profile.user_id,
        companyId: company?.id ?? null,
        role: accessSourceSnapshot?.resolvedRole ?? accessSourceSnapshot?.authRole,
      });
    } catch (error) {
      showMarketplacePhotoUploadError(error);
      return null;
    }
  }, [accessSourceSnapshot?.authRole, accessSourceSnapshot?.resolvedRole, company?.id, profile]);

  const handlePickMarketplaceMedia = useCallback(async (input: {
    mediaKind: "photo" | "video";
    source: "camera" | "library";
  }) => {
    if (!profile) return null;
    try {
      return await uploadMarketplaceProductMedia({
        userId: profile.user_id,
        companyId: company?.id ?? null,
        role: accessSourceSnapshot?.resolvedRole ?? accessSourceSnapshot?.authRole,
        mediaKind: input.mediaKind,
        source: input.source,
      });
    } catch (error) {
      showMarketplacePhotoUploadError(error);
      return null;
    }
  }, [accessSourceSnapshot?.authRole, accessSourceSnapshot?.resolvedRole, company?.id, profile]);

  const publishListing = async () => {
    if (!profile || savingListing) return;
    setPublishStatus("validating");
    setPublishedListingId(null);

    const nextValidationErrors = buildAddListingValidationErrors({
      listingTitle,
      listingKind,
      marketplaceMediaAssetIds,
      listingDescription,
      listingCity,
      listingPrice,
      listingPhone,
    });
    if (hasValidationErrors(nextValidationErrors)) {
      setValidationErrors(nextValidationErrors);
      setPublishStatus("failed_retryable");
      Alert.alert(
        UI_COPY.alertTitle,
        firstValidationError(nextValidationErrors) ?? UI_COPY.alertTitle,
      );
      return;
    }
    setValidationErrors({});

    try {
      setSavingListing(true);

      let lat: number | null = null;
      let lng: number | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPublishStatus("failed_retryable");
        setValidationErrors({ submit: UI_COPY.locationPermissionMessage });
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
        setPublishStatus("failed_retryable");
        setValidationErrors({ submit: UI_COPY.locationFailedMessage });
        Alert.alert(UI_COPY.locationTitle, UI_COPY.locationFailedMessage);
        return;
      }

      if (lat == null || lng == null) {
        setPublishStatus("failed_retryable");
        setValidationErrors({ submit: UI_COPY.locationMissingCoordsMessage });
        Alert.alert(UI_COPY.locationTitle, UI_COPY.locationMissingCoordsMessage);
        return;
      }

      const result = await createMarketListing({
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
        marketplaceMediaAssetIds,
        marketplaceMediaAssets,
        lat,
        lng,
        onPublishStage: setPublishStatus,
      });

      setPublishedListingId(result.listingId);
      setPublishStatus("published");

      Alert.alert(UI_COPY.successTitle, UI_COPY.successMessage, [
        {
          text: UI_COPY.openShowcaseAction,
          onPress: () => {
            resetAndExitAddListingFlow();
            router.push(buildSupplierShowcaseRoute());
          },
        },
        {
          text: UI_COPY.okAction,
          style: "cancel",
          onPress: resetAndExitAddListingFlow,
        },
      ]);
    } catch (error: unknown) {
      const message = getAddListingErrorMessage(error);
      setPublishStatus("failed_retryable");
      setValidationErrors({ submit: message });
      Alert.alert(UI_COPY.alertTitle, message);
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
        publishStatus={publishStatus}
        validationErrors={validationErrors}
        publishedListingId={publishedListingId}
        onRequestClose={resetAndExitAddListingFlow}
        onPublish={publishListing}
        onChangeListingKind={handleListingKindChange}
        onChangeListingTitle={handleListingTitleChange}
        onChangeListingCity={handleListingCityChange}
        onChangeListingPrice={handleListingPriceChange}
        onChangeListingDescription={handleListingDescriptionChange}
        onChangeListingPhone={handleListingPhoneChange}
        onMarketplaceMediaSnapshotChange={(snapshot) => {
          setMarketplaceMediaAssetIds(snapshot.mediaAssetIds);
          setMarketplaceMediaAssets(snapshot.mediaAssets ?? snapshot.mediaAssetIds.map((mediaAssetId) => ({
            mediaAssetId,
            mediaKind: "photo",
          })));
          if (snapshot.mediaAssetIds.length > 0) {
            clearValidationError("media");
          }
        }}
        onPickMarketplaceMedia={handlePickMarketplaceMedia}
        onPickMarketplacePhoto={handlePickMarketplacePhoto}
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
