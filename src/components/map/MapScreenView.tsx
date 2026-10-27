import React from "react";
import {
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  Pressable,
} from "react-native";

import CatalogSearchModal from "./CatalogSearchModal";
import DemandDetailsModal from "./DemandDetailsModal";
import FiltersModal from "./FiltersModal";
import MapFab from "./MapFab";
import MapRenderer from "./MapRenderer";
import ResultsBottomSheet from "./ResultsBottomSheet";
import TopSearchBar from "./TopSearchBar";
import { MAP_SCREEN_UI as UI, styles } from "./MapScreen.styles";
import type { MapViewportUpdate } from "./mapContracts";
import type { CatalogItem } from "./types";
import type { MapScreenController } from "./useMapScreenController";

export default function MapScreenView(props: MapScreenController) {
  const {
    listingsForMap,
    spiderPoints,
    clusterMode,
    selectedId,
    region,
    myLoc,
    focusById,
    onRegionChangeDebounced,
    setViewport,
    filters,
    activeFiltersCount,
    searchOpen,
    setSearchOpen,
    filtersOpen,
    setFiltersOpen,
    filteredListings,
    setClusterMode,
    setSelectedId,
    setFilters,
    resetFilters,
    rowsForBottom,
    setRegion,
    openListingDetails,
    openListingShowcase,
    openListingChat,
    setOfferDemand,
    demandDetails,
    setDemandDetails,
    openAssistant,
    goToMyLocation,
    offerDemand,
    offerPrice,
    setOfferPrice,
    offerDays,
    setOfferDays,
    offerComment,
    setOfferComment,
    sendingOffer,
    submitOffer,
  } = props;

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <MapRenderer
          listings={listingsForMap}
          spiderPoints={spiderPoints}
          hideClusterId={clusterMode?.clusterId || null}
          selectedId={selectedId}
          region={region}
          myLoc={myLoc}
          onSelect={(id) => focusById(id)}
          onRegionChange={onRegionChangeDebounced}
          onViewportChange={(v: MapViewportUpdate) => {
            // web пришлет bounds+zoom, native пришлет только zoom
            setViewport((prev) => ({
              zoom: typeof v.zoom === "number" ? v.zoom : prev.zoom,
              bounds: v.bounds?.west != null ? v.bounds : prev.bounds,
            }));
          }}
        />

        <TopSearchBar
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        <CatalogSearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          onPick={(item: CatalogItem) => {
            setClusterMode(null);
            setSelectedId(null);
            setFilters((p) => ({ ...p, catalogItem: item, kind: item.kind }));
            setSearchOpen(false);
          }}
        />

        <FiltersModal
          visible={filtersOpen}
          value={filters}
          resultsCount={filteredListings.length}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setClusterMode(null);
            setSelectedId(null);
            setFilters(next);
          }}
          onReset={resetFilters}
        />

        <ResultsBottomSheet
          count={rowsForBottom.length}
          modeLabel={clusterMode?.title || null}
          onClearMode={clusterMode ? () => setClusterMode(null) : undefined}
          rows={rowsForBottom.map((x) => ({
            id: x.id,
            title: `${x.title} • ${x.id.slice(0, 6)}`,
            city: x.city,
            price: x.price,
            side: x.side ?? null,
            items_json: x.items_json ?? null,
          }))}
          selectedId={selectedId}
          onPick={(row) => {
            setSelectedId(row.id);

            const item =
              rowsForBottom.find((x) => x.id === row.id) ||
              filteredListings.find((x) => x.id === row.id);

            if (item?.lat != null && item?.lng != null) {
              setRegion({
                latitude: item.lat,
                longitude: item.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              });
            }

            if (item?.side === "demand") setDemandDetails(item);
          }}
          onOpenDetails={(row) => openListingDetails(row)}
          onOpenShowcase={(row) => void openListingShowcase(row)}
          onOpenChat={(row) => openListingChat(row)}
          onSendOffer={(r) => {
            const item =
              rowsForBottom.find((x) => x.id === r.id) ||
              filteredListings.find((x) => x.id === r.id);
            if (item) setOfferDemand(item);
          }}
        />

        <DemandDetailsModal
          visible={!!demandDetails}
          title={demandDetails?.title || "Запрос"}
          city={demandDetails?.city || null}
          items={Array.isArray(demandDetails?.items_json) ? demandDetails.items_json : []}
          onOpenDetails={demandDetails ? () => openListingDetails(demandDetails) : undefined}
          onOpenShowcase={demandDetails ? () => void openListingShowcase(demandDetails) : undefined}
          onOpenChat={demandDetails ? () => openListingChat(demandDetails) : undefined}
          onAskAssistant={() => openAssistant(demandDetails)}
          onClose={() => setDemandDetails(null)}
        />

        <MapFab onGeo={goToMyLocation} onReset={resetFilters} onAssistant={() => openAssistant()} />
      </View>

      <Modal
        visible={!!offerDemand}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferDemand(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Коммерческое предложение</Text>

            <TextInput
              placeholder="Цена (сом)"
              placeholderTextColor={UI.sub}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Срок поставки (дней)"
              placeholderTextColor={UI.sub}
              value={offerDays}
              onChangeText={setOfferDays}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Комментарий / условия"
              placeholderTextColor={UI.sub}
              value={offerComment}
              onChangeText={setOfferComment}
              style={styles.modalInput}
              multiline
            />

            <Pressable
              onPress={submitOffer}
              disabled={sendingOffer}
              style={[styles.modalSend, sendingOffer && { opacity: 0.6 }]}
            >
              <Text style={styles.modalSendText}>{sendingOffer ? "Отправка..." : "Отправить"}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setOfferDemand(null);
                setOfferPrice("");
                setOfferDays("");
                setOfferComment("");
              }}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
