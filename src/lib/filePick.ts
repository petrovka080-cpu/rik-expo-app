// src/lib/filePick.ts
import { Alert, Platform } from "react-native";

type PickOpts = { accept?: string };

export async function pickFileAny(opts: PickOpts = {}) {
  const accept =
    opts.accept ?? ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

  try {
    // WEB
    if (Platform.OS === "web") {
      return await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.onchange = () => {
          const f = (input.files && input.files[0]) || null;
          try { input.remove(); } catch {}
          resolve(f);
        };
        input.click();
      });
    }

    // NATIVE
    // @ts-ignore
    const DocPicker = await import("expo-document-picker");
    const res = await (DocPicker as any).getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });

    if (res?.canceled) return null;
    return (res?.assets?.[0] ?? res) || null;
  } catch (e: any) {
    Alert.alert("Файл", e?.message ?? "Не удалось выбрать файл");
    return null;
  }
}
