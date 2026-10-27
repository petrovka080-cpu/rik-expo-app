import type { ComponentType } from "react";
import { Platform } from "react-native";
import type { MapRendererProps } from "./mapContracts";

// ⚠️ ВАЖНО:
// require() — чтобы web не тянул react-native-maps
// и native не тянул leaflet

const MapRenderer =
  Platform.OS === "web"
    ?  
      require("./MapRenderer.web").default
    :  
      require("./MapRenderer.native").default;

export default MapRenderer as ComponentType<MapRendererProps>;
