import { View, Text } from "react-native";

import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>Страница не найдена</Text>
    </View>
  );
}

export default withScreenErrorBoundary(NotFound, {
  screen: "not_found",
  route: "/+not-found",
});
