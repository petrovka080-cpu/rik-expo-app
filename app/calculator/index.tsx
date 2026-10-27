// DEEP-LINK CONTRACT: ORPHANED STUB — zero navigation references from src/.
// Kept for deep-link safety. Do not add new features here.

import { View, Text } from "react-native";
import { Link } from "expo-router";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function Calculator() {
  return (
    <View style={{flex:1,alignItems:"center",justifyContent:"center", gap:12}}>
      <Text style={{fontSize:20}}>Калькулятор (заглушка)</Text>
      <Link href="/office/foreman">Назад к прорабу</Link>
    </View>
  );
}

export default withScreenErrorBoundary(Calculator, {
  screen: "calculator",
  route: "/calculator",
});
