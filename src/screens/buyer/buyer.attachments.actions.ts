// src/screens/buyer/buyer.attachments.actions.ts
import { Platform } from "react-native";

type AlertFn = (t: string, m: string) => void;

export type PickedFile = any; // web File | native doc asset | custom

type UploadFn = (proposalId: string, file: any, fileName: string, groupKey: string) => Promise<void>;

type LoadAttachmentsFn = (proposalId: string) => Promise<void>;

/**
 * 1) Прикрепить файл к proposal (универсально)
 * - pickFileAny (внешний)
 * - upload
 * - reload list
 */
export async function attachFileToProposalAction(p: {
  proposalId: string;
  groupKey: string;
  pickFileAny: () => Promise<PickedFile | null>;
  uploadProposalAttachment: UploadFn;
  loadProposalAttachments: LoadAttachmentsFn;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}) {
  const pid = String(p.proposalId || "").trim();
  if (!pid) return;

  const f = await p.pickFileAny();
  if (!f) return;

  const fileName = String((f as any)?.name ?? `file_${Date.now()}`).trim() || `file_${Date.now()}`;

  p.setBusy(true);
  try {
    await p.uploadProposalAttachment(pid, f, fileName, p.groupKey);
    await p.loadProposalAttachments(pid);
  } catch (e: any) {
    p.alert("Ошибка", e?.message ?? "Не удалось прикрепить файл");
  } finally {
    p.setBusy(false);
  }
}

/**
 * 2) Web: выбрать файл счёта (invoice) и сразу загрузить
 * Поведение 1:1 как было в buyer.tsx (через <input type="file">)
 */
export async function openInvoicePickerWebAction(p: {
  proposalId: string;
  uploadProposalAttachment: UploadFn;
  setInvoiceUploadedName: (name: string) => void;
  alert: AlertFn;
}) {
  if (Platform.OS !== "web") return;

  const pid = String(p.proposalId || "").trim();
  if (!pid) {
    p.alert("Ошибка", "Не выбран документ");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.jpg,.jpeg,.png";

  input.onchange = async () => {
    try {
      const f = (input.files && input.files[0]) || null;
      if (!f) return;

      await p.uploadProposalAttachment(pid, f, f.name, "invoice");
      p.setInvoiceUploadedName(f.name);
      p.alert("Готово", `Счёт прикреплён: ${f.name}`);
    } catch (err: any) {
      p.alert("Ошибка загрузки", err?.message ?? String(err));
    } finally {
      try { input.remove(); } catch {}
    }
  };

  input.click();
}

/**
 * 3) Универсальный pickInvoiceFile (web/native) — возвращает файл, но НЕ грузит.
 * 1:1 как было: web input, native expo-document-picker.
 */
export async function pickInvoiceFileAction(): Promise<any | null> {
  try {
    if (Platform.OS === "web") {
      return await new Promise<any | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.jpg,.jpeg,.png";
        input.onchange = () => {
          const f = (input.files && input.files[0]) || null;
          resolve(f);
        };
        input.click();
      });
    } else {
      // @ts-ignore
      const DocPicker = await import("expo-document-picker");
      const res = await (DocPicker as any).getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res?.canceled) return null;
      const f = res?.assets?.[0] ?? res;
      return f || null;
    }
  } catch (e: any) {
    return null;
  }
}
