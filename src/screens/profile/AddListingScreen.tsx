import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  buildMarketProductRoute,
  MARKET_MY_LISTINGS_REFRESH_ROUTE,
  MARKET_MY_LISTINGS_ROUTE,
  MARKET_TAB_ROUTE,
  MARKET_TAB_REFRESH_ROUTE,
} from "../../lib/navigation/coreRoutes";
import type { LiveRoutePendingMediaPreview } from "../../features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel";
import { profileStyles } from "./profile.styles";
import { searchCatalogItems } from "./profile.services";
import {
  CatalogSearchItem,
  getAddListingErrorMessage,
  ListingKind,
  UI_COPY,
} from "./profile.types";
import {
  ListingModal,
  type AddListingPublishStatus,
  type AddListingValidationErrors,
} from "./components/ListingModal";
import { useListingForm } from "./hooks/useListingForm";
import { useAddListingOwnerContext } from "./hooks/useAddListingOwnerContext";
import {
  prefetchStableMarketplaceImages,
  showMarketplacePhotoUploadError,
  uploadMarketplaceProductMedia,
} from "./profile.marketplaceMedia";
import { buildListingCatalogItem } from "./addListingCatalogItem";
import {
  buildAddListingValidationErrors,
  firstAddListingValidationError,
  hasAddListingValidationErrors,
} from "./addListingValidation";
import { submitAddListing } from "./addListingSubmission";
import { resolveAddListingReturnNavigation } from "./addListingNavigation";

const styles = profileStyles;

export function AddListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entry?: string | string[];
    returnTo?: string | string[];
  }>();
  const { returnRoute, backAfterPublishLabel } =
    resolveAddListingReturnNavigation(params);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [marketplaceMediaAssetIds, setMarketplaceMediaAssetIds] = useState<string[]>([]);
  const [marketplaceMediaAssets, setMarketplaceMediaAssets] = useState<{
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[]>([]);
  const [marketplacePhotoPublicUrls, setMarketplacePhotoPublicUrls] = useState<string[]>([]);
  const [marketplaceVideoPublicUrls, setMarketplaceVideoPublicUrls] = useState<string[]>([]);
  const [marketplaceMediaUploading, setMarketplaceMediaUploading] = useState(false);
  const [marketplaceFailedMediaCount, setMarketplaceFailedMediaCount] = useState(0);
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

  const handleOwnerLoadError = useCallback(
    (error: unknown) => {
      Alert.alert(UI_COPY.alertTitle, getAddListingErrorMessage(error));
      router.replace(returnRoute);
    },
    [returnRoute, router],
  );
  const {
    accessModel,
    accessSourceSnapshot,
    company,
    loading,
    profile,
  } = useAddListingOwnerContext({
    prepareListingForm,
    onLoadError: handleOwnerLoadError,
  });
  const marketplaceOwnerCompanyId =
    accessModel.activeContext === "office" && company ? company.id : null;

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
    setMarketplacePhotoPublicUrls([]);
    setMarketplaceVideoPublicUrls([]);
    setMarketplaceMediaUploading(false);
    setMarketplaceFailedMediaCount(0);
    setValidationErrors({});
    setPublishStatus("idle");
    setPublishedListingId(null);
    if (returnRoute === MARKET_MY_LISTINGS_ROUTE) {
      router.replace(MARKET_MY_LISTINGS_REFRESH_ROUTE(String(Date.now())));
    } else if (returnRoute === MARKET_TAB_ROUTE) {
      router.replace(MARKET_TAB_REFRESH_ROUTE(String(Date.now())));
    } else {
      router.replace(returnRoute);
    }
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

    const base = buildListingCatalogItem({
      item,
      city: listingCity,
      profileCity: profile?.city,
      companyCity: company?.city,
      listingKind,
    });
    setListingRikCode(base.rik_code);
    setListingTitle(base.name);
    setListingUom(base.uom || "");
    setEditingItem(base);
    setItemModalOpen(true);
    setCatalogResults([]);
  };

  const handleEditingItemCityChange = (value: string) => setEditingItem((prev) => (prev ? { ...prev, city: value } : prev));
  const handleEditingItemUomChange = (value: string) => setEditingItem((prev) => (prev ? { ...prev, uom: value } : prev));
  const handleEditingItemQtyChange = (value: string) => setEditingItem((prev) => (prev ? { ...prev, qty: value } : prev));
  const handleEditingItemPriceChange = (value: string) => setEditingItem((prev) => (prev ? { ...prev, price: value } : prev));

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

  const handlePickMarketplaceMedia = useCallback(async (input: {
    mediaKind: "photo" | "video";
    source: "camera" | "library";
    selectionLimit?: number;
    onPendingMediaPreview?: (items: LiveRoutePendingMediaPreview[]) => void;
  }) => {
    if (!profile) return null;
    try {
      return await uploadMarketplaceProductMedia({
        userId: profile.user_id,
        companyId: marketplaceOwnerCompanyId,
        role: accessSourceSnapshot?.resolvedRole ?? accessSourceSnapshot?.authRole,
        mediaKind: input.mediaKind,
        source: input.source,
        selectionLimit: input.selectionLimit,
        onPendingMediaPreview: input.onPendingMediaPreview,
      });
    } catch (error) {
      showMarketplacePhotoUploadError(error);
      return null;
    }
  }, [accessSourceSnapshot?.authRole, accessSourceSnapshot?.resolvedRole, marketplaceOwnerCompanyId, profile]);

  useEffect(() => {
    prefetchStableMarketplaceImages(marketplacePhotoPublicUrls);
  }, [marketplacePhotoPublicUrls]);

  const publishListing = async () => {
    if (!profile || savingListing) return;
    setPublishStatus("validating");
    setPublishedListingId(null);

    if (marketplaceMediaUploading) {
      setPublishStatus("uploading_media");
      setValidationErrors({
        media: "Дождитесь загрузки фото или видео перед публикацией.",
      });
      return;
    }

    if (marketplaceFailedMediaCount > 0) {
      setPublishStatus("failed_retryable");
      setValidationErrors({
        media: "Удалите или замените медиа с ошибкой загрузки.",
      });
      return;
    }

    const nextValidationErrors = buildAddListingValidationErrors({
      listingTitle,
      listingKind,
      marketplaceMediaAssetIds,
      listingDescription,
      listingCity,
      listingPrice,
      listingPhone,
    });
    if (hasAddListingValidationErrors(nextValidationErrors)) {
      setValidationErrors(nextValidationErrors);
      setPublishStatus("failed_retryable");
      Alert.alert(
        UI_COPY.alertTitle,
        firstAddListingValidationError(nextValidationErrors) ??
          UI_COPY.alertTitle,
      );
      return;
    }
    setValidationErrors({});
    if (!listingKind) return;
    try {
      setSavingListing(true);
      const result = await submitAddListing({
        profile,
        company,
        activeContext: accessModel.activeContext,
        companyId: marketplaceOwnerCompanyId,
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
        listingCartItems,
        marketplaceMediaAssetIds,
        marketplaceMediaAssets,
        photoPublicUrls: marketplacePhotoPublicUrls,
        videoPublicUrls: marketplaceVideoPublicUrls,
        onPublishStage: setPublishStatus,
      });
      if (!result.ok) {
        setPublishStatus("failed_retryable");
        setValidationErrors({ submit: result.message });
        Alert.alert(UI_COPY.locationTitle, result.message);
        return;
      }

      setPublishedListingId(result.listingId);
      setPublishStatus("published");

      Alert.alert(UI_COPY.successTitle, UI_COPY.successMessage, [
        {
          text: "Открыть объявление",
          onPress: () => {
            resetAndExitAddListingFlow();
            router.push(buildMarketProductRoute(result.listingId));
          },
        },
        {
          text: backAfterPublishLabel,
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

  const openPublishedListing = () => {
    if (!publishedListingId) return;
    const listingId = publishedListingId;
    resetAndExitAddListingFlow();
    router.push(buildMarketProductRoute(listingId));
  };

  const backToMarketAfterPublish = () => {
    resetAndExitAddListingFlow();
  };

  const openMyListings = () => {
    router.replace(MARKET_MY_LISTINGS_ROUTE);
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
        mediaUploading={marketplaceMediaUploading}
        catalogLoading={catalogLoading}
        publishStatus={publishStatus}
        validationErrors={validationErrors}
        publishedListingId={publishedListingId}
        onRequestClose={resetAndExitAddListingFlow}
        onPublish={publishListing}
        onOpenMyListings={openMyListings}
        onOpenPublishedListing={openPublishedListing}
        onBackToMarket={backToMarketAfterPublish}
        backAfterPublishLabel={backAfterPublishLabel}
        onChangeListingKind={handleListingKindChange}
        onChangeListingTitle={handleListingTitleChange}
        onChangeListingCity={handleListingCityChange}
        onChangeListingPrice={handleListingPriceChange}
        onChangeListingDescription={handleListingDescriptionChange}
        onChangeListingPhone={handleListingPhoneChange}
        onMarketplaceMediaSnapshotChange={(snapshot) => {
          setMarketplaceMediaUploading(snapshot.uploadInProgress === true);
          setMarketplaceFailedMediaCount(snapshot.failedMediaCount ?? 0);
          setMarketplaceMediaAssetIds(snapshot.mediaAssetIds);
          setMarketplaceMediaAssets(snapshot.mediaAssets ?? snapshot.mediaAssetIds.map((mediaAssetId) => ({
            mediaAssetId,
            mediaKind: "photo",
          })));
          setMarketplacePhotoPublicUrls(snapshot.photoPublicUrls ?? []);
          setMarketplaceVideoPublicUrls(snapshot.videoPublicUrls ?? []);
          if (snapshot.mediaAssetIds.length > 0 && !snapshot.uploadInProgress) {
            clearValidationError("media");
          }
        }}
        onPickMarketplaceMedia={handlePickMarketplaceMedia}
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
