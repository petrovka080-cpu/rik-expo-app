// DEEP-LINK CONTRACT: ORPHANED — zero navigation references from src/.
// Kept for deep-link safety. Legacy inline screen with direct Supabase queries.
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { supabase } from "../../../src/lib/supabaseClient";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

type RequestDetailsRow = {
  id: string;
  object: string | null;
  rik_code: string | null;
  name: string | null;
  qty: number | null;
  uom: string | null;
  status: string | null;
};

function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<RequestDetailsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) {
        setErrorText("Не передан ID заявки.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("requests")
        .select("id,object,rik_code,name,qty,uom,status")
        .eq("id", String(id))
        .single();

      if (error) {
        setErrorText("Не удалось загрузить заявку.");
        if (__DEV__) console.info("Supabase error:", error);
      } else {
        setItem(data);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Загрузка...</Text>
      </View>
    );
  }

  if (errorText) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, color: "red" }}>{errorText}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16 }}>Заявка не найдена</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>
        Заявка №{item.id}
      </Text>

      <Text style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "bold" }}>Объект:</Text>{" "}
        {item.object ?? "—"}
      </Text>

      <Text style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "bold" }}>РИК:</Text>{" "}
        {item.rik_code ?? "—"}
      </Text>

      <Text style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "bold" }}>Наименование:</Text>{" "}
        {item.name ?? "—"}
      </Text>

      <Text style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "bold" }}>Количество:</Text>{" "}
        {item.qty ?? "—"} {item.uom ?? ""}
      </Text>

      <Text style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "bold" }}>Статус:</Text>{" "}
        {item.status ?? "—"}
      </Text>
    </View>
  );
}

export default withScreenErrorBoundary(RequestDetails, {
  screen: "request",
  route: "/request/[id]",
});
