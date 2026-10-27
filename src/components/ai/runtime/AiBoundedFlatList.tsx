import React from "react";
import {
  FlatList,
  Text,
  type FlatListProps,
  type ListRenderItem,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER = 8;
export const AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH = 8;
export const AI_BOUNDED_FLATLIST_WINDOW_SIZE = 5;
export const AI_BOUNDED_FLATLIST_MAX_ITEMS = 20;

export type AiBoundedFlatListProps<T> = Omit<
  FlatListProps<T>,
  | "data"
  | "initialNumToRender"
  | "maxToRenderPerBatch"
  | "windowSize"
  | "keyExtractor"
  | "ListEmptyComponent"
  | "renderItem"
> & {
  data: readonly T[] | null | undefined;
  keyExtractor: (item: T, index: number) => string;
  ListEmptyComponent: FlatListProps<T>["ListEmptyComponent"];
  renderItem: ListRenderItem<T>;
  overLimitMessage?: string;
  overLimitTextStyle?: StyleProp<TextStyle>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function getAiBoundedFlatListData<T>(data: readonly T[] | null | undefined): T[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, AI_BOUNDED_FLATLIST_MAX_ITEMS);
}

export function AiBoundedFlatList<T>({
  data,
  keyExtractor,
  ListEmptyComponent,
  renderItem,
  overLimitMessage,
  overLimitTextStyle,
  testID,
  ...rest
}: AiBoundedFlatListProps<T>): React.ReactElement {
  const boundedData = getAiBoundedFlatListData(data);
  const sourceCount = Array.isArray(data) ? data.length : 0;
  const isOverLimit = sourceCount > AI_BOUNDED_FLATLIST_MAX_ITEMS;

  return (
    <FlatList
      {...rest}
      testID={testID ?? "ai.screen.runtime.list"}
      data={boundedData}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isOverLimit ? (
          <Text testID="ai.screen.runtime.list.limit" style={overLimitTextStyle}>
            {overLimitMessage ?? `Showing first ${AI_BOUNDED_FLATLIST_MAX_ITEMS} items`}
          </Text>
        ) : (
          rest.ListFooterComponent
        )
      }
      initialNumToRender={AI_BOUNDED_FLATLIST_INITIAL_NUM_TO_RENDER}
      maxToRenderPerBatch={AI_BOUNDED_FLATLIST_MAX_TO_RENDER_PER_BATCH}
      windowSize={AI_BOUNDED_FLATLIST_WINDOW_SIZE}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
    />
  );
}
