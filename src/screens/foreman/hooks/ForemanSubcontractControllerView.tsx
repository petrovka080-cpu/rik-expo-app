import React from "react";
import { View } from "react-native";

import {
  ForemanSubcontractMainSections,
  ForemanSubcontractModalStack,
} from "../ForemanSubcontractTab.sections";

type ForemanSubcontractControllerViewProps = {
  mainSectionsProps: React.ComponentProps<typeof ForemanSubcontractMainSections>;
  modalStackProps: React.ComponentProps<typeof ForemanSubcontractModalStack>;
};

export function ForemanSubcontractControllerView({
  mainSectionsProps,
  modalStackProps,
}: ForemanSubcontractControllerViewProps) {
  return (
    <View style={{ flex: 1 }}>
      <ForemanSubcontractMainSections {...mainSectionsProps} />
      <ForemanSubcontractModalStack {...modalStackProps} />
    </View>
  );
}
