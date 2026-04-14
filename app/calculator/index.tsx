
import { View, Text } from "react-native";
import { Link } from "expo-router";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function Calculator() {
  return (
    <View style={{flex:1,alignItems:"center",justifyContent:"center", gap:12}}>
      <Text style={{fontSize:20}}>Калькулятор (заглушка)</Text>
      <Link href="/foreman">Назад к прорабу</Link>
    </View>
  );
}

export default withScreenErrorBoundary(Calculator, {
  screen: "calculator",
  route: "/calculator",
});
