import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import { searchMaterialCatalogItemsForPicker } from "../../lib/catalog/catalog.facade";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { registerTimeout, type TimerRegistryHandle } from "../../lib/lifecycle/timerRegistry";
import { ConsumerRepairItemRow } from "./ConsumerRepairItemRow";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type {
  RequestEstimateSectionViewModel,
  RequestEstimateViewModel,
} from "./requestEstimateViewModel";

type Props = {
  viewModel: RequestEstimateViewModel;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onSpecificationChange?: (itemId: string, value: string) => void;
  onOptionalChange?: (itemId: string, optional: boolean) => void;
  onRemove: (itemId: string) => void;
  onAddManual: (initialQuery?: string) => void;
  onSelectCatalogItem?: (item: CatalogItemPickerItem) => void;
  onOpenCatalog?: (itemId: string) => void;
  onOpenPhoto?: (itemId: string) => void;
  showPhotoButtons?: boolean;
  rowPhotoThumbnails?: Readonly<Record<string, string>>;
};

type State = {
  estimateIdentity: string;
  searchQuery: string;
  catalogRows: CatalogItemPickerItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  lastCatalogQuery: string | null;
  collapsedSectionIds: Record<string, true>;
};

type ExistingEstimateSearchMatch = {
  itemId: string;
  titleRu: string;
  sectionId: string;
  sectionTitle: string;
};

type EstimateMaterialSearchAddControlProps = {
  query: string;
  existingMatches: ExistingEstimateSearchMatch[];
  catalogRows: CatalogItemPickerItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  lastCatalogQuery: string | null;
  onChangeQuery: (query: string) => void;
  onSubmit: () => void;
  onSelectExisting: (match: ExistingEstimateSearchMatch) => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
};

export function EstimateMaterialSearchAddControl({
  query,
  existingMatches,
  catalogRows,
  catalogLoading,
  catalogError,
  lastCatalogQuery,
  onChangeQuery,
  onSubmit,
  onSelectExisting,
  onSelectCatalogItem,
}: EstimateMaterialSearchAddControlProps): React.ReactElement {
  const hasQuery = query.trim().length > 0;
  return (
    <View style={styles.materialSearchWrap} testID="estimate-material-search-add-control">
      <View style={styles.searchAddControl}>
        <TextInput
          accessibilityLabel="Найти в смете или добавить материал"
          importantForAutofill="no"
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmit}
          placeholder="Найти в смете или добавить материал…"
          placeholderTextColor="#64748B"
          returnKeyType="search"
          style={styles.searchInput}
          testID="request-estimate-items-search"
          value={query}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить материал из каталога"
          onPress={onSubmit}
          style={styles.addCatalogButton}
          testID="request-estimate-add-from-catalog"
        >
          <Text style={styles.addCatalogButtonText}>+</Text>
        </Pressable>
      </View>
      {hasQuery ? (
        <View style={styles.searchResults} testID="estimate-material-search-sections">
          <View style={styles.searchResultSection} testID="estimate-material-search-existing-section">
            <Text style={styles.searchSectionLabel}>В этой смете</Text>
            {existingMatches.slice(0, 12).map((match) => (
              <Pressable
                accessibilityRole="button"
                key={`${match.sectionId}:${match.itemId}`}
                onPress={() => onSelectExisting(match)}
                style={styles.searchResultRow}
                testID={`estimate-material-search-existing-${match.itemId}`}
              >
                <Text numberOfLines={2} style={styles.searchResultTitle}>{match.titleRu}</Text>
                <Text style={styles.searchResultMeta}>{match.sectionTitle}</Text>
              </Pressable>
            ))}
            {existingMatches.length === 0 ? (
              <Text style={styles.searchResultEmpty}>Совпадений в текущей смете нет.</Text>
            ) : null}
          </View>
          <View style={styles.searchResultSection} testID="estimate-material-search-catalog-section">
            <Text style={styles.searchSectionCatalogLabel}>Добавить из каталога</Text>
            {catalogLoading ? <ActivityIndicator color="#16A34A" size="small" /> : null}
            {catalogError ? (
              <Pressable accessibilityRole="button" onPress={onSubmit} style={styles.catalogRetry}>
                <Text style={styles.catalogError}>{catalogError}</Text>
                <Text style={styles.catalogRetryText}>Повторить</Text>
              </Pressable>
            ) : null}
            {!catalogLoading && !catalogError && lastCatalogQuery && catalogRows.length === 0 ? (
              <Text style={styles.searchResultEmpty}>Подходящих материалов в каталоге не найдено.</Text>
            ) : null}
            {catalogRows.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={`${item.catalogItemId}:${item.unit}`}
                onPress={() => onSelectCatalogItem(item)}
                style={styles.catalogResultRow}
                testID={`estimate-material-search-catalog-${item.catalogItemId}`}
              >
                <Text numberOfLines={2} style={styles.searchResultTitle}>{item.name}</Text>
                <Text style={styles.catalogResultMeta}>
                  {item.rikCode} · {formatEstimateUnitLabel(item.unit)} · {item.sourceLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function estimateIdentity(viewModel: RequestEstimateViewModel): string {
  return viewModel.sections
    .map((section) => `${section.id}:${section.items.map((item) => item.id).join(",")}`)
    .join("|");
}

export class RequestEstimateItemsEditor extends React.PureComponent<Props, State> {
  private searchSequence = 0;
  private searchTimer: TimerRegistryHandle | null = null;

  state: State = {
    estimateIdentity: estimateIdentity(this.props.viewModel),
    searchQuery: "",
    catalogRows: [],
    catalogLoading: false,
    catalogError: null,
    lastCatalogQuery: null,
    collapsedSectionIds: {},
  };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const nextIdentity = estimateIdentity(props.viewModel);
    return nextIdentity === state.estimateIdentity
      ? null
      : {
          estimateIdentity: nextIdentity,
          searchQuery: "",
          catalogRows: [],
          catalogLoading: false,
          catalogError: null,
          lastCatalogQuery: null,
          collapsedSectionIds: {},
        };
  }

  componentWillUnmount(): void {
    this.cancelScheduledSearch();
    this.searchSequence += 1;
  }

  private cancelScheduledSearch(): void {
    this.searchTimer?.dispose();
    this.searchTimer = null;
  }

  private updateSearch = (searchQuery: string): void => {
    this.cancelScheduledSearch();
    const sequence = ++this.searchSequence;
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      this.setState({
        searchQuery,
        catalogRows: [],
        catalogLoading: false,
        catalogError: null,
        lastCatalogQuery: null,
      });
      return;
    }
    this.setState({ searchQuery, catalogLoading: true, catalogError: null });
    this.searchTimer = registerTimeout(
      "request-estimate:material-live-search",
      () => {
        this.searchTimer = null;
        void this.searchCatalog(normalizedQuery, sequence);
      },
      250,
    );
  };

  private searchCatalog = async (
    queryValue: string,
    sequence = ++this.searchSequence,
  ): Promise<void> => {
    const query = queryValue.trim();
    if (query.length < 2) return;
    this.setState({ catalogLoading: true, catalogError: null, lastCatalogQuery: query });
    try {
      const catalogRows = await searchMaterialCatalogItemsForPicker(query, 12);
      if (sequence !== this.searchSequence) return;
      this.setState({ catalogRows, catalogLoading: false });
    } catch {
      if (sequence !== this.searchSequence) return;
      this.setState({
        catalogRows: [],
        catalogLoading: false,
        catalogError: "Поиск материалов временно недоступен.",
      });
    }
  };

  private toggleSection = (sectionId: string): void => {
    this.setState((state) => {
      const collapsedSectionIds = { ...state.collapsedSectionIds };
      if (collapsedSectionIds[sectionId]) delete collapsedSectionIds[sectionId];
      else collapsedSectionIds[sectionId] = true;
      return { collapsedSectionIds };
    });
  };

  private openCatalogForCurrentQuery = (): void => {
    const explicitQuery = this.state.searchQuery.trim();
    const recommendedMaterial = this.props.viewModel.sections
      .find((section) => section.id === "materials")?.items[0]?.titleRu?.trim();
    const contextualQuery = explicitQuery || recommendedMaterial || this.props.viewModel.title.trim();
    if (!this.props.onSelectCatalogItem) {
      this.props.onAddManual(contextualQuery);
      return;
    }
    this.cancelScheduledSearch();
    const sequence = ++this.searchSequence;
    this.setState({ searchQuery: contextualQuery }, () => {
      void this.searchCatalog(contextualQuery, sequence);
    });
  };

  private selectExistingMatch = (match: ExistingEstimateSearchMatch): void => {
    this.setState((state) => {
      const collapsedSectionIds = { ...state.collapsedSectionIds };
      delete collapsedSectionIds[match.sectionId];
      return { collapsedSectionIds };
    }, () => {
      if (typeof document === "undefined") return;
      const testId = `request-estimate-item-anchor-${match.itemId}`;
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-testid^='request-estimate-item-anchor-']"))
        .find((element) => element.getAttribute("data-testid") === testId);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus?.();
    });
  };

  private selectCatalogItem = (item: CatalogItemPickerItem): void => {
    if (this.props.onSelectCatalogItem) {
      this.props.onSelectCatalogItem(item);
      return;
    }
    this.props.onAddManual(this.state.searchQuery.trim() || item.name);
  };

  render(): React.ReactElement {
    const {
      viewModel,
      onDecrease,
      onIncrease,
      onQuantityChange,
      onUnitPriceChange,
      onSpecificationChange,
      onOptionalChange,
      onRemove,
      onOpenCatalog,
      onOpenPhoto,
      showPhotoButtons,
    } = this.props;
    const normalizedQuery = this.state.searchQuery.trim().toLocaleLowerCase("ru-RU");
    const filteredSections = viewModel.sections.map((section) => {
      const stageMatches = section.title.toLocaleLowerCase("ru-RU").includes(normalizedQuery);
      return {
        ...section,
        items: normalizedQuery && !stageMatches
          ? section.items.filter((item) => [
              item.titleRu,
              item.category,
              item.quantityFormula,
              item.normSourceTitle,
            ].some((value) => String(value ?? "").toLocaleLowerCase("ru-RU").includes(normalizedQuery)))
          : section.items,
      };
    }).filter((section) => section.items.length > 0);
    const expandedSections = filteredSections.filter((section) =>
      Boolean(normalizedQuery) || !this.state.collapsedSectionIds[section.id]);
    const existingMatches: ExistingEstimateSearchMatch[] = filteredSections.flatMap((section) =>
      section.items.map((item) => ({
        itemId: item.id,
        titleRu: item.titleRu,
        sectionId: section.id,
        sectionTitle: section.title,
      })));

    return (
      <View style={styles.wrap} testID="request-estimate-items-editor-content">
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{"\u041f\u043e\u043b\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430"}</Text>
          <Text style={styles.rowCount} testID="request-estimate-items-total-count">
            {`${viewModel.rawItemCount} ${"\u043f\u043e\u0437\u0438\u0446\u0438\u0439"}`}
          </Text>
        </View>
        <EstimateMaterialSearchAddControl
          query={this.state.searchQuery}
          existingMatches={existingMatches}
          catalogRows={this.state.catalogRows}
          catalogLoading={this.state.catalogLoading}
          catalogError={this.state.catalogError}
          lastCatalogQuery={this.state.lastCatalogQuery}
          onChangeQuery={this.updateSearch}
          onSubmit={this.openCatalogForCurrentQuery}
          onSelectExisting={this.selectExistingMatch}
          onSelectCatalogItem={this.selectCatalogItem}
        />
        {(normalizedQuery ? filteredSections : viewModel.sections).map((section) => {
          const isCollapsed = !normalizedQuery && this.state.collapsedSectionIds[section.id] === true;
          return (
            <Pressable
              accessibilityLabel={`${section.title}: ${section.items.length} ${"\u043f\u043e\u0437\u0438\u0446\u0438\u0439"}`}
              accessibilityRole="button"
              key={`stage-${section.id}`}
              onPress={() => this.toggleSection(section.id)}
              style={styles.stageToggle}
              testID={`request-estimate-stage-toggle-${section.id}`}
            >
              <Text style={styles.stageToggleText}>{`${isCollapsed ? "\u25b8" : "\u25be"} ${section.title}`}</Text>
              <Text style={styles.stageToggleCount}>{section.items.length}</Text>
            </Pressable>
          );
        })}
        {normalizedQuery && filteredSections.length === 0 ? (
          <Text style={styles.emptySearch} testID="request-estimate-items-search-empty">
            {"\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e. \u0418\u0437\u043c\u0435\u043d\u0438\u0442\u0435 \u0437\u0430\u043f\u0440\u043e\u0441."}
          </Text>
        ) : null}
        {expandedSections.map((section: RequestEstimateSectionViewModel) => (
          <View key={section.id} style={styles.section} testID={`request-estimate-section-${section.id}`}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, index) => (
              <View
                focusable
                key={`${item.id}-${index}`}
                testID={`request-estimate-item-anchor-${item.id}`}
              >
                <ConsumerRepairItemRow
                  item={item}
                  onDecrease={onDecrease}
                  onIncrease={onIncrease}
                  onQuantityChange={onQuantityChange}
                  onUnitPriceChange={onUnitPriceChange}
                  onSpecificationChange={onSpecificationChange}
                  onOptionalChange={onOptionalChange}
                  onRemove={onRemove}
                  onOpenCatalog={onOpenCatalog}
                  onOpenPhoto={onOpenPhoto}
                  showPhotoButton={showPhotoButtons === true}
                  photoThumbnailUri={this.props.rowPhotoThumbnails?.[item.id] ?? null}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  heading: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowCount: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  materialSearchWrap: {
    gap: 8,
  },
  searchAddControl: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
  },
  addCatalogButton: {
    width: 48,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
  },
  addCatalogButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  searchResults: {
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10,
  },
  searchResultSection: {
    gap: 6,
  },
  searchSectionLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  searchSectionCatalogLabel: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "900",
  },
  searchResultRow: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  catalogResultRow: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchResultTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  searchResultMeta: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  catalogResultMeta: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "700",
  },
  searchResultEmpty: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 3,
  },
  catalogRetry: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 9,
  },
  catalogError: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  catalogRetryText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  stageToggle: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
  },
  stageToggleText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "900",
  },
  stageToggleCount: {
    minWidth: 28,
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  emptySearch: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    paddingVertical: 8,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
