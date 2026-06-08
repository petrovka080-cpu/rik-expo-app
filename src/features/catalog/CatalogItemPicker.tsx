import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  searchCatalogItemsForPicker,
  type CatalogItemPickerItem,
} from "../../lib/catalog/catalog.facade";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItemPickerItem) => void;
  initialQuery?: string;
};

type State = {
  query: string;
  loading: boolean;
  rows: CatalogItemPickerItem[];
  error: string | null;
};

export class CatalogItemPicker extends React.Component<Props, State> {
  private previousWebBodyOverflow: string | null = null;

  state: State = {
    query: this.props.initialQuery ?? "бетон",
    loading: false,
    rows: [],
    error: null,
  };

  componentDidMount(): void {
    this.syncWebBodyScrollLock(this.props.visible);
  }

  componentDidUpdate(prevProps: Props): void {
    if (!prevProps.visible && this.props.visible) {
      this.setState({ query: this.props.initialQuery ?? "бетон", rows: [], error: null }, () => {
        void this.search();
      });
    }
    if (prevProps.visible !== this.props.visible) {
      this.syncWebBodyScrollLock(this.props.visible);
    }
  }

  componentWillUnmount(): void {
    this.syncWebBodyScrollLock(false);
  }

  private syncWebBodyScrollLock(visible: boolean): void {
    const body = typeof document === "undefined" ? null : document.body;
    if (!body) return;

    if (visible && this.previousWebBodyOverflow === null) {
      this.previousWebBodyOverflow = body.style.overflow;
      body.style.overflow = "hidden";
      return;
    }

    if (!visible && this.previousWebBodyOverflow !== null) {
      body.style.overflow = this.previousWebBodyOverflow;
      this.previousWebBodyOverflow = null;
    }
  }

  private search = async () => {
    const query = this.state.query.trim();
    if (query.length < 2) {
      this.setState({ rows: [], error: null });
      return;
    }
    this.setState({ loading: true, error: null });
    try {
      const rows = await searchCatalogItemsForPicker(query, 40);
      this.setState({ rows, loading: false });
    } catch {
      this.setState({ rows: [], loading: false, error: "Каталог временно недоступен" });
    }
  };

  private setQuery = (query: string) => {
    this.setState({ query });
  };

  render(): React.ReactNode {
    return (
      <Modal visible={this.props.visible} animationType="slide" transparent>
        <View style={styles.overlay} testID="request-catalog-item-picker">
          <View style={styles.sheet}>
            <View style={styles.header} testID="request-catalog-picker-header">
              <Text style={styles.title}>Каталог материалов</Text>
              <Pressable accessibilityRole="button" onPress={this.props.onClose} testID="request-catalog-picker-close">
                <Text style={styles.close}>Закрыть</Text>
              </Pressable>
            </View>
            <View style={styles.searchRow} testID="request-catalog-picker-search-row">
              <TextInput
                value={this.state.query}
                onChangeText={this.setQuery}
                placeholder="бетон, арматура, песок"
                style={styles.input}
                testID="request-catalog-picker-search"
              />
              <Pressable accessibilityRole="button" onPress={this.search} style={styles.searchButton} testID="request-catalog-picker-submit">
                <Text style={styles.searchButtonText}>Найти</Text>
              </Pressable>
            </View>
            {this.state.loading ? <ActivityIndicator color="#2563EB" /> : null}
            {this.state.error ? <Text style={styles.error}>{this.state.error}</Text> : null}
            <ScrollView
              style={styles.resultsScroller}
              contentContainerStyle={styles.results}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              testID="request-catalog-picker-results-scroll"
            >
              {this.state.rows.slice(0, 40).map((item) => (
                <Pressable
                  key={`${item.catalogItemId}:${item.unit}`}
                  accessibilityRole="button"
                  onPress={() => this.props.onSelect(item)}
                  style={styles.row}
                  testID={`request-catalog-picker-row-${item.catalogItemId}`}
                >
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.rikCode} · {formatEstimateUnitLabel(item.unit)} · {item.sourceLabel}
                  </Text>
                </Pressable>
              ))}
              {!this.state.loading && this.state.rows.length === 0 ? (
                <Text style={styles.empty}>Введите запрос и выберите материал из catalog_items.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.32)",
  },
  sheet: {
    height: "86%",
    maxHeight: "86%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  close: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  searchButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  resultsScroller: {
    flex: 1,
    minHeight: 0,
  },
  results: {
    gap: 8,
    paddingBottom: 12,
  },
  row: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  rowTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  rowMeta: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
  },
});
