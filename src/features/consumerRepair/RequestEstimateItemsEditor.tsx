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

export type RequestEstimateCategoryFilterId =
  | "all"
  | "materials"
  | "labor"
  | "machinery"
  | "services"
  | "delivery";

export const REQUEST_ESTIMATE_CATEGORY_FILTERS: ReadonlyArray<{
  id: RequestEstimateCategoryFilterId;
  label: string;
}> = [
  { id: "all", label: "Все" },
  { id: "materials", label: "Материалы" },
  { id: "labor", label: "Работы" },
  { id: "machinery", label: "Механизмы" },
  { id: "services", label: "Услуги" },
  { id: "delivery", label: "Доставка" },
];

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
  collapsedCategoryIds: Partial<Record<Exclude<RequestEstimateCategoryFilterId, "all">, true>>;
};

type ExistingEstimateSearchMatch = {
  itemId: string;
  titleRu: string;
  categoryFilterId: Exclude<RequestEstimateCategoryFilterId, "all">;
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
                key={match.itemId}
                onPress={() => onSelectExisting(match)}
                style={styles.searchResultRow}
                testID={`estimate-material-search-existing-${match.itemId}`}
              >
                <Text numberOfLines={2} style={styles.searchResultTitle}>{match.titleRu}</Text>
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

type CategoryFilterItem = RequestEstimateSectionViewModel["items"][number];

function categorySignals(item: CategoryFilterItem): string[] {
  const source = item.sourceParameters ?? {};
  const smartProjection = source.smartEstimateProjectionV2;
  const smartCategory = smartProjection && typeof smartProjection === "object"
    ? (smartProjection as { category?: unknown }).category
    : null;
  return [
    source.rowKind,
    source.row_kind,
    source.section,
    source.sectionType,
    source.asphaltV4ProfessionalCategory,
    smartCategory,
    item.category,
  ]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase("ru-RU"))
    .filter(Boolean);
}

export function requestEstimateCategoryFilterForItem(
  item: CategoryFilterItem,
  sectionId: string,
): Exclude<RequestEstimateCategoryFilterId, "all"> {
  const signals = categorySignals(item);
  const hasIn = (candidates: string[], ...values: string[]) => candidates.some((signal) =>
    values.some((value) => signal === value || signal.includes(`_${value}`) || signal.includes(`${value}_`)));

  if (hasIn(signals, "delivery", "logistics", "transport", "freight", "haul")) return "delivery";
  if (hasIn(signals, "machinery", "machine", "mechanism", "equipment", "tool")) return "machinery";
  if (hasIn(signals, "service", "services", "testing", "test", "documentation", "commissioning", "overhead", "supervision")) {
    return "services";
  }
  if (hasIn(signals, "labor", "work", "works", "temporary_work") || item.itemType === "work") return "labor";
  if (hasIn(signals, "material", "materials", "product", "waste") || item.itemType === "material") return "materials";

  const sectionSignals = [sectionId.trim().toLocaleLowerCase("ru-RU")];
  if (hasIn(sectionSignals, "delivery", "logistics", "transport")) return "delivery";
  if (hasIn(sectionSignals, "machinery", "equipment")) return "machinery";
  if (hasIn(sectionSignals, "labor", "work")) return "labor";
  if (hasIn(sectionSignals, "material")) return "materials";
  return item.itemType === "service" ? "services" : "materials";
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
    collapsedCategoryIds: {},
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
          collapsedCategoryIds: {},
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
      const collapsedCategoryIds = { ...state.collapsedCategoryIds };
      delete collapsedCategoryIds[match.categoryFilterId];
      return { collapsedCategoryIds };
    }, () => {
      if (typeof document === "undefined") return;
      const testId = `request-estimate-item-anchor-${match.itemId}`;
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-testid^='request-estimate-item-anchor-']"))
        .find((element) => element.getAttribute("data-testid") === testId);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus?.();
    });
  };

  private toggleCategory = (categoryId: RequestEstimateCategoryFilterId): void => {
    if (categoryId === "all") {
      this.setState((state) => {
        const anyCollapsed = Object.keys(state.collapsedCategoryIds).length > 0;
        return {
          collapsedCategoryIds: anyCollapsed
            ? {}
            : Object.fromEntries(
                REQUEST_ESTIMATE_CATEGORY_FILTERS
                  .filter((filter) => filter.id !== "all")
                  .map((filter) => [filter.id, true]),
              ) as State["collapsedCategoryIds"],
        };
      });
      return;
    }
    this.setState((state) => {
      const collapsedCategoryIds = { ...state.collapsedCategoryIds };
      if (collapsedCategoryIds[categoryId]) delete collapsedCategoryIds[categoryId];
      else collapsedCategoryIds[categoryId] = true;
      return { collapsedCategoryIds };
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
      return {
        ...section,
        items: normalizedQuery
          ? section.items.filter((item) => [
              item.titleRu,
              item.category,
              item.quantityFormula,
              item.normSourceTitle,
            ].some((value) => String(value ?? "").toLocaleLowerCase("ru-RU").includes(normalizedQuery)))
          : section.items,
      };
    }).filter((section) => section.items.length > 0);
    const filteredEntries = filteredSections.flatMap((section) => section.items.map((item) => ({
      item,
      categoryFilterId: requestEstimateCategoryFilterForItem(item, section.id),
    })));
    const categoryCounts = filteredEntries.reduce<Partial<Record<RequestEstimateCategoryFilterId, number>>>(
      (counts, entry) => ({
        ...counts,
        all: (counts.all ?? 0) + 1,
        [entry.categoryFilterId]: (counts[entry.categoryFilterId] ?? 0) + 1,
      }),
      {},
    );
    const visibleItems = filteredEntries
      .filter((entry) => !this.state.collapsedCategoryIds[entry.categoryFilterId])
      .map((entry) => entry.item);
    const existingMatches: ExistingEstimateSearchMatch[] = filteredSections.flatMap((section) =>
      section.items.map((item) => ({
        itemId: item.id,
        titleRu: item.titleRu,
        categoryFilterId: requestEstimateCategoryFilterForItem(item, section.id),
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
        <View
          accessibilityRole="tablist"
          style={styles.categoryFilters}
          testID="request-estimate-category-filters"
        >
          {REQUEST_ESTIMATE_CATEGORY_FILTERS.map((filter) => {
            const selected = filter.id === "all"
              ? Object.keys(this.state.collapsedCategoryIds).length === 0
              : !this.state.collapsedCategoryIds[filter.id];
            return (
              <Pressable
                accessibilityLabel={filter.id === "all"
                  ? "Показать все позиции"
                  : `${selected ? "Скрыть" : "Показать"}: ${filter.label}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={filter.id}
                onPress={() => this.toggleCategory(filter.id)}
                style={styles.categoryFilter}
                testID={`request-estimate-category-filter-${filter.id}`}
              >
                <Text style={styles.categoryFilterText}>
                  {`${selected ? "▾" : "▸"} ${filter.label}`}
                </Text>
                <Text style={styles.categoryFilterCount}>{categoryCounts[filter.id] ?? 0}</Text>
              </Pressable>
            );
          })}
        </View>
        {normalizedQuery && filteredSections.length === 0 ? (
          <Text style={styles.emptySearch} testID="request-estimate-items-search-empty">
            {"\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e. \u0418\u0437\u043c\u0435\u043d\u0438\u0442\u0435 \u0437\u0430\u043f\u0440\u043e\u0441."}
          </Text>
        ) : null}
        <View style={styles.section} testID="request-estimate-flat-row-list">
          {visibleItems.map((item, index) => (
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
  categoryFilters: {
    alignItems: "stretch",
    gap: 6,
  },
  categoryFilter: {
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
  categoryFilterText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "900",
  },
  categoryFilterCount: {
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
});
