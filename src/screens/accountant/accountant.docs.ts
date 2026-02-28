import { Platform, Share } from "react-native";
import { exportProposalPdf } from "../../lib/catalog_api";
import { openAttachment, uploadProposalAttachment } from "../../lib/files";
import { safeAlert } from "./helpers";
import { pickAnyFile } from "./pickAnyFile";

export async function shareProposalCard(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;

  const uriOrUrl = await exportProposalPdf(pid, "preview");
  if (Platform.OS === "web") {
    window.open(String(uriOrUrl), "_blank", "noopener,noreferrer");
    return;
  }
  await Share.share({ message: String(uriOrUrl) });
}

export async function openProposalSourceDoc(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await openAttachment(pid, "proposal_pdf", { all: false });
}

export async function openInvoiceDoc(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await openAttachment(pid, "invoice", { all: false });
}

export async function openPaymentDocsOrUpload(p: {
  proposalId: string;
  reload: () => Promise<void>;
}): Promise<void> {
  const pid = String(p.proposalId || "").trim();
  if (!pid) return;

  try {
    await openAttachment(pid, "payment", { all: true });
    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const low = msg.toLowerCase();
    const notFound =
      low.includes("не найдены") || low.includes("не найден") || low.includes("not found");
    if (!notFound) {
      safeAlert("Платёжные документы", msg);
      return;
    }
  }

  const f = await pickAnyFile();
  if (!f) return;

  const filename = String(f?.name ?? f?.fileName ?? `payment_${Date.now()}.pdf`);
  await uploadProposalAttachment(pid, f, filename, "payment");
  await p.reload();

  try {
    await openAttachment(pid, "payment", { all: false });
  } catch {
    safeAlert("Загружено", "Файл загружен, но открыть не удалось. Нажмите ещё раз.");
  }
}

