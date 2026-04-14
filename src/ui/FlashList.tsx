import React from "react";
import { FlatList, type FlatListProps } from "react-native";
import { logger } from "../lib/logger";

type CompatOverrideItemLayout<T> = (
  layout: { size?: number; span?: number },
  item: T,
  index: number,
  maxColumns?: number,
  extraData?: unknown,
) => void;

export type FlashListProps<T> = FlatListProps<T> & {
  estimatedItemSize?: number;
  overrideItemLayout?: CompatOverrideItemLayout<T>;
  drawDistance?: number;
  onBlankArea?: (event: unknown) => void;
  getItemType?: (item: T, index: number, extraData?: unknown) => string | number | undefined;
  maintainVisibleContentPosition?: FlatListProps<T>["maintainVisibleContentPosition"];
};

const isNewArchitectureEnabled = Boolean((globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager);
let didLogLegacyFallback = false;

function loadFlashListImpl() {
  try {
    // Lazy-load only on Fabric/new architecture; legacy runtime must never evaluate FlashList v2.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@shopify/flash-list") as { FlashList?: React.ComponentType<any> };
    return mod.FlashList ?? null;
  } catch {
    return null;
  }
}

const CompatFlashListInner = <T,>(
  {
    estimatedItemSize,
    overrideItemLayout,
    drawDistance,
    onBlankArea,
    getItemType,
    maintainVisibleContentPosition,
    ...rest
  }: FlashListProps<T>,
  ref: React.ForwardedRef<FlatList<T>>,
) => {
  if (isNewArchitectureEnabled) {
    const NativeFlashList = loadFlashListImpl();
    if (NativeFlashList) {
      return (
        <NativeFlashList
          ref={ref}
          estimatedItemSize={estimatedItemSize}
          overrideItemLayout={overrideItemLayout}
          drawDistance={drawDistance}
          onBlankArea={onBlankArea}
          getItemType={getItemType}
          maintainVisibleContentPosition={maintainVisibleContentPosition}
          {...rest}
        />
      );
    }
  }

  if (!didLogLegacyFallback) {
    didLogLegacyFallback = true;
    logger.info("flash-list.compat", "legacy architecture fallback -> FlatList");
  }

  return <FlatList ref={ref} {...rest} />;
};

export const FlashList = React.forwardRef(CompatFlashListInner) as <T>(
  props: FlashListProps<T> & { ref?: React.ForwardedRef<FlatList<T>> },
) => React.ReactElement | null;
