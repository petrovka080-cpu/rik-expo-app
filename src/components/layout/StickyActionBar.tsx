import React from "react";

import { AppStickyActionBar } from "./AppStickyActionBar";

type StickyAction = {
  labelRu: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

export type StickyActionBarProps = {
  primary?: StickyAction;
  secondary?: StickyAction[];
  visible: boolean;
  safeAboveBottomNav: true;
};

export default function StickyActionBar({
  primary,
  secondary = [],
  visible,
}: StickyActionBarProps) {
  return (
    <AppStickyActionBar
      visible={visible}
      safeAreaAware
      placement="above_bottom_nav"
      primary={primary}
      secondary={secondary}
    />
  );
}
