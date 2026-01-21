import { Platform } from "react-native";

// ⚠️ ВАЖНО:
// require() — чтобы web не тянул react-native-maps
// и native не тянул leaflet

const MapRenderer =
  Platform.OS === "web"
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("./MapRenderer.web").default
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("./MapRenderer.native").default;

export default MapRenderer;
