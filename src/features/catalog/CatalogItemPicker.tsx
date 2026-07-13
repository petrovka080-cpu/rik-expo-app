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
  lastSearchedQuery: string | null;
};

export class CatalogItemPicker extends React.Component<Props, State> {
  private previousWebBodyOverflow: string | null = null;
  private searchSequence = 0;

  state: State = {
    query: this.props.initialQuery ?? "бетон",
    loading: false,
    rows: [],
    error: null,
    lastSearchedQuery: null,
  };

  componentDidMount(): void {
    this.syncWebBodyScrollLock(this.props.visible);
    if (this.props.visible) {
      void this.search(this.state.query);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (!prevProps.visible && this.props.visible) {
      this.setState({ query: this.props.initialQuery ?? "", rows: [], error: null, lastSearchedQuery: null }, () => {
        void this.search(this.state.query);
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

  private search = async (queryValue = this.state.query) => {
    const query = queryValue.trim();
    if (query.length < 2) {
      this.searchSequence += 1;
      this.setState({ rows: [], loading: false, error: null, lastSearchedQuery: null });
      return;
    }
    const sequence = ++this.searchSequence;
    this.setState({ loading: true, error: null, lastSearchedQuery: query });
    try {
      const rows = await searchCatalogItemsForPicker(query, 40);
      if (sequence !== this.searchSequence) return;
      this.setState({ rows, loading: false });
    } catch {
      if (sequence !== this.searchSequence) return;
      this.setState({ rows: [], loading: false, error: "Каталог временно недоступен" });
    }
  };

  private setQuery = (query: string) => {
    this.setState({ query }, () => {
      void this.search(query);
    });
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
                placeholder="Введите 2 буквы: бе, ар, пе"
                style={styles.input}
                testID="request-catalog-picker-search"
              />
            </View>
            <Text style={styles.hint} testID="request-catalog-picker-live-search-hint">
              Поиск запускается автоматически и подбирает материалы из catalog_items.
            </Text>
            {this.state.lastSearchedQuery ? (
              <Text style={styles.resultsTitle} testID="request-catalog-picker-results-title">
                Подобранные материалы: {this.state.lastSearchedQuery}
              </Text>
            ) : null}
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
                <Text style={styles.empty}>Введите минимум две буквы, например “бе” или “ар”.</Text>
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
  hint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  resultsTitle: {
    color: "#334155",
    fontSize: 13,
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
