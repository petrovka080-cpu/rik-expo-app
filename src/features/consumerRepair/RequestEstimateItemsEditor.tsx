import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const nextIdentity = estimateIdentity(props.viewModel);
    return nextIdentity === state.estimateIdentity
      ? null
      : {
          estimateIdentity: nextIdentity,
          visibleLimit: ESTIMATE_ROWS_PAGE_SIZE,
        };
  }

  private showMore = (): void => {
    const totalRows = this.props.viewModel.sections.reduce(
      (total, section) => total + section.items.length,
      0,
    );
    this.setState((state) => ({
      visibleLimit: Math.min(state.visibleLimit + ESTIMATE_ROWS_PAGE_SIZE, totalRows),
    }));
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
    const totalRows = viewModel.sections.reduce((total, section) => total + section.items.length, 0);
    let remainingRows = this.state.visibleLimit;
    const visibleSections = viewModel.sections
      .map((section) => {
        const items = section.items.slice(0, Math.max(0, remainingRows));
        remainingRows -= items.length;
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
    const visibleRows = Math.min(this.state.visibleLimit, totalRows);

    return (
      <View style={styles.wrap} testID="request-estimate-items-editor">
        <Text style={styles.heading}>{"\u041f\u043e\u0437\u0438\u0446\u0438\u0438"}</Text>
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
