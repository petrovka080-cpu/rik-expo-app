import { Platform } from "react-native";

export type PickedFile = {
  name?: string;
  fileName?: string;
  uri?: string;
  type?: string;
  mimeType?: string | null;
  size?: number | null;
};

export async function pickAnyFile(): Promise<PickedFile | null> {
  if (Platform.OS === "web") {
    return await new Promise<PickedFile | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.jpg,.jpeg,.png";

      let done = false;
      const finish = (val: PickedFile | null) => {
        if (done) return;
        done = true;
        try {
          window.removeEventListener("focus", onFocus, true);
        } catch {}
        try {
          input.remove();
        } catch {}
        resolve(val);
      };

      const onChange = () => {
        const f = (input.files && input.files[0]) || null;
        finish(f);
      };

      const onFocus = () => {
        setTimeout(() => {
          const f = (input.files && input.files[0]) || null;
          finish(f);
        }, 250);
      };

      input.addEventListener("change", onChange, { once: true });
      window.addEventListener("focus", onFocus, true);
      document.body.appendChild(input);
      input.click();
    });
  }

  const docPicker = await import("expo-document-picker");
  if (typeof docPicker.getDocumentAsync !== "function") return null;
  const res = await docPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res?.canceled) return null;
  return (res?.assets?.[0] as PickedFile | undefined) ?? null;
}

