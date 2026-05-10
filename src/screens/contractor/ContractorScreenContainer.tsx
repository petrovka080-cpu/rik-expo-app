import React from "react";

import ContractorScreenView from "./ContractorScreenView";
import {
  useContractorScreenController,
  type ContractorScreenControllerParams,
} from "./useContractorScreenController";

export function ContractorScreenContainer(props: ContractorScreenControllerParams) {
  const controller = useContractorScreenController(props);
  return <ContractorScreenView {...controller} />;
}
