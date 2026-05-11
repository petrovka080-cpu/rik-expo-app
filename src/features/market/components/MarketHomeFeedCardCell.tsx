import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import MarketFeedCard from "./MarketFeedCard";
import type { MarketHomeListingCard } from "../marketHome.types";

type Props = {
  item: MarketHomeListingCard;
  width: number;
  onOpenListing: (item: MarketHomeListingCard) => void;
  onOpenPhone: (phone: string) => void | Promise<void>;
  onOpenWhatsApp: (url: string) => void | Promise<void>;
  onPushSupplierMap: (item: MarketHomeListingCard) => void;
};

export const MarketHomeFeedCardCell = React.memo(function MarketHomeFeedCardCell({
  item,
  width,
  onOpenListing,
  onOpenPhone,
  onOpenWhatsApp,
  onPushSupplierMap,
}: Props) {
  const cellStyle = useMemo(() => [styles.feedCell, { width }], [width]);
  const handleOpen = useCallback(() => onOpenListing(item), [item, onOpenListing]);
  const handleMapPress = useCallback(() => onPushSupplierMap(item), [item, onPushSupplierMap]);
  const handlePhonePress = useCallback(() => {
    if (item.phone) void onOpenPhone(item.phone);
  }, [item.phone, onOpenPhone]);
  const handleWhatsAppPress = useCallback(() => {
    if (item.whatsapp) void onOpenWhatsApp(item.whatsapp);
  }, [item.whatsapp, onOpenWhatsApp]);

  return (
    <View style={cellStyle}>
      <MarketFeedCard
        variant="market-primary"
        listing={item}
        onOpen={handleOpen}
        onMapPress={handleMapPress}
        onPhonePress={item.phone ? handlePhonePress : undefined}
        onWhatsAppPress={item.whatsapp ? handleWhatsAppPress : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  feedCell: {
    marginBottom: 14,
  },
});
