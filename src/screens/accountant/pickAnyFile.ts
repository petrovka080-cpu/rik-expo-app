import { Platform } from "react-native";
import { reportAndSwallow } from "../../lib/observability/catchDiscipline";

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
      const cleanup = (scope: "remove_focus_listener" | "remove_input", task: () => void) => {
        try {
          task();
        } catch (error) {
          reportAndSwallow({
            screen: "accountant",
            surface: "attachment_picker",
            event: "picker_cleanup_failed",
            error,
            kind: "cleanup_only",
            sourceKind: "dom:file_input",
            errorStage: "cleanup",
            extra: {
              scope,
            },
          });
        }
      };
      const finish = (val: PickedFile | null) => {
        if (done) return;
        done = true;
        cleanup("remove_focus_listener", () => window.removeEventListener("focus", onFocus, true));
        cleanup("remove_input", () => input.remove());
        resolve(val);
      };

      const onChange = () => {
        const f = (input.files && input.files[0]) || null;
        finish(f);
      };

      const runAfterFocusRestore = (task: () => void) => {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => {
            requestAnimationFrame(task);
          });
          return;
        }

        if (typeof queueMicrotask === "function") {
          queueMicrotask(task);
          return;
        }

        task();
      };

      const onFocus = () => {
        runAfterFocusRestore(() => {
          const f = (input.files && input.files[0]) || null;
          finish(f);
        });
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
