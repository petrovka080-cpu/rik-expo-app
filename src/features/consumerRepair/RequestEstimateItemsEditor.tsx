import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ConsumerRepairItemRow } from "./ConsumerRepairItemRow";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  viewModel: RequestEstimateViewModel;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
  onOpenPhoto?: (itemId: string) => void;
  showPhotoButtons?: boolean;
};

type State = {
  estimateIdentity: string;
  visibleLimit: number;
  searchQuery: string;
  collapsedSectionIds: Record<string, true>;
};

const ESTIMATE_ROWS_PAGE_SIZE = 6;

function estimateIdentity(viewModel: RequestEstimateViewModel): string {
  return viewModel.sections
    .map((section) => `${section.id}:${section.items.map((item) => item.id).join(",")}`)
    .join("|");
}

export class RequestEstimateItemsEditor extends React.PureComponent<Props, State> {
  state: State = {
    estimateIdentity: estimateIdentity(this.props.viewModel),
    visibleLimit: ESTIMATE_ROWS_PAGE_SIZE,
    searchQuery: "",
    collapsedSectionIds: {},
  };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const nextIdentity = estimateIdentity(props.viewModel);
    return nextIdentity === state.estimateIdentity
      ? null
      : {
          estimateIdentity: nextIdentity,
          visibleLimit: ESTIMATE_ROWS_PAGE_SIZE,
          searchQuery: "",
          collapsedSectionIds: {},
        };
  }

  private showMore = (): void => {
    this.setState((state) => ({
      visibleLimit: state.visibleLimit + ESTIMATE_ROWS_PAGE_SIZE,
    }));
  };

  private updateSearch = (searchQuery: string): void => {
    this.setState({ searchQuery, visibleLimit: ESTIMATE_ROWS_PAGE_SIZE });
  };

  private toggleSection = (sectionId: string): void => {
    this.setState((state) => {
      const collapsedSectionIds = { ...state.collapsedSectionIds };
      if (collapsedSectionIds[sectionId]) delete collapsedSectionIds[sectionId];
      else collapsedSectionIds[sectionId] = true;
      return { collapsedSectionIds };
    });
  };

  render(): React.ReactElement {
    const {
      viewModel,
      onDecrease,
      onIncrease,
      onQuantityChange,
      onUnitPriceChange,
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
    const expandedSections = filteredSections.filter((section) => !this.state.collapsedSectionIds[section.id]);
    const totalRows = expandedSections.reduce((total, section) => total + section.items.length, 0);
    let remainingRows = this.state.visibleLimit;
    const visibleSections = expandedSections
      .map((section) => {
        const items = section.items.slice(0, Math.max(0, remainingRows));
        remainingRows -= items.length;
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
    const visibleRows = Math.min(this.state.visibleLimit, totalRows);

    return (
      <View style={styles.wrap} testID="request-estimate-items-editor-content">
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{"\u041f\u043e\u043b\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430"}</Text>
          <Text style={styles.rowCount} testID="request-estimate-items-total-count">
            {`${viewModel.rawItemCount} ${"\u043f\u043e\u0437\u0438\u0446\u0438\u0439"}`}
          </Text>
        </View>
        <TextInput
          accessibilityLabel="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0441\u043c\u0435\u0442\u0435"
          onChangeText={this.updateSearch}
          placeholder="\u041d\u0430\u0439\u0442\u0438 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b, \u0440\u0430\u0431\u043e\u0442\u0443, \u043d\u043e\u0440\u043c\u0443..."
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          testID="request-estimate-items-search"
          value={this.state.searchQuery}
        />
        {viewModel.sections.map((section) => {
          const isCollapsed = this.state.collapsedSectionIds[section.id] === true;
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
        {visibleSections.map((section) => (
          <View key={section.id} style={styles.section} testID={`request-estimate-section-${section.id}`}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, index) => (
              <ConsumerRepairItemRow
                key={`${item.id}-${index}`}
                item={item}
                onDecrease={onDecrease}
                onIncrease={onIncrease}
                onQuantityChange={onQuantityChange}
                onUnitPriceChange={onUnitPriceChange}
                onRemove={onRemove}
                onOpenCatalog={onOpenCatalog}
                onOpenPhoto={onOpenPhoto}
                showPhotoButton={showPhotoButtons === true}
              />
            ))}
          </View>
        ))}
        {visibleRows < totalRows ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Показать следующие позиции сметы. Показано ${visibleRows} из ${totalRows}`}
            onPress={this.showMore}
            style={styles.loadMoreButton}
            testID="request-estimate-items-load-more"
          >
            <Text style={styles.loadMoreText}>{`Показать ещё · ${visibleRows} из ${totalRows}`}</Text>
          </Pressable>
        ) : null}
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
  searchInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
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
  loadMoreButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },
  loadMoreText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
