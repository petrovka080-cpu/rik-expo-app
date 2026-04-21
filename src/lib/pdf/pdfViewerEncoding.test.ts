import fs from "fs";
import path from "path";

import { isCorruptedText, normalizeRuText } from "../text/encoding";

const viewerPath = path.join(process.cwd(), "app/pdf-viewer.tsx");
const presenterPath = path.join(
  process.cwd(),
  "src/lib/pdf/PdfViewerScreenContent.tsx",
);
const nativeShellPath = path.join(
  process.cwd(),
  "src/lib/pdf/PdfViewerNativeShell.tsx",
);
const source = [
  fs.readFileSync(viewerPath, "utf8"),
  fs.readFileSync(presenterPath, "utf8"),
  fs.readFileSync(nativeShellPath, "utf8"),
].join("\n");

describe("PDF viewer text encoding", () => {
  it("keeps the PDF viewer handoff and loading copy readable after the B1 split", () => {
    const expectedLabels = [
      "Открывается...",
      "Документ открыт во внешнем PDF-приложении",
      "Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда.",
      "Открыть ещё раз",
      "Поделиться",
    ];

    for (const label of expectedLabels) {
      expect(source).toContain(label);
      expect(isCorruptedText(label)).toBe(false);
      expect(normalizeRuText(label)).toBe(label);
    }
  });

  it("does not keep the previous mojibake literals in the viewer path", () => {
    const corruptedMarkers = [
      "РІР‚В¦",
      "Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ",
      "Р вЂќР С•Р С”РЎС“Р СР ВµР Р…РЎвЂљ",
      "Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ",
      "Р СџР С•Р Т‘Р ВµР В»Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ",
    ];

    for (const marker of corruptedMarkers) {
      expect(source).not.toContain(marker);
    }
  });
});
