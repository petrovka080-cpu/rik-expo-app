import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import {
  AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER,
  AI_BOUNDED_FLATLIST_MAX_ITEMS,
  AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH,
  AI_BOUNDED_FLATLIST_WINDOW_SIZE,
  AiBoundedFlatList,
  getAiBoundedFlatListData,
} from "../../src/components/ai/runtime/AiBoundedFlatList";

type Row = {
  id: string;
  title: string;
};

const rows: Row[] = Array.from({ length: 25 }, (_, index) => ({
  id: `row-${index}`,
  title: `Row ${index}`,
}));

describe("AiBoundedFlatList contract", () => {
  it("hard-bounds AI runtime lists to 20 items and safe render budgets", () => {
    const bounded = getAiBoundedFlatListData(rows);

    expect(bounded).toHaveLength(AI_BOUNDED_FLATLIST_MAX_ITEMS);
    expect(bounded[0]?.id).toBe("row-0");
    expect(bounded[19]?.id).toBe("row-19");
    expect(AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER).toBeLessThanOrEqual(8);
    expect(AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH).toBeLessThanOrEqual(8);
    expect(AI_BOUNDED_FLATLIST_WINDOW_SIZE).toBeLessThanOrEqual(5);
  });

  it("passes a required keyExtractor, ListEmptyComponent, and stable list props to FlatList", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(AiBoundedFlatList<Row>, {
          data: rows,
          keyExtractor: (item: Row) => item.id,
          ListEmptyComponent: React.createElement(Text, { testID: "ai.screen.runtime.list.empty" }, "empty"),
          renderItem: ({ item }) =>
            React.createElement(Text, { testID: `ai-row-${item.id}` }, item.title),
        }),
      );
    });

    const list = renderer!.root.findByProps({ testID: "ai.screen.runtime.list" });

    expect(list.props.data).toHaveLength(20);
    expect(list.props.initialNumToRender).toBe(8);
    expect(list.props.maxToRenderPerBatch).toBe(8);
    expect(list.props.windowSize).toBe(5);
    expect(list.props.keyboardShouldPersistTaps).toBe("handled");
    expect(typeof list.props.keyExtractor).toBe("function");
    expect(list.props.ListEmptyComponent).toBeTruthy();
    expect(list.props.removeClippedSubviews).toBe(true);
  });
});
