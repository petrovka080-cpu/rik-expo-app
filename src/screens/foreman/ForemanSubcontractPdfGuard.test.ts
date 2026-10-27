import { readFileSync } from "fs";
import { join } from "path";

const controllerSource = readFileSync(
  join(process.cwd(), "src/screens/foreman/hooks/useForemanSubcontractController.tsx"),
  "utf8",
);
const pdfActionsSource = readFileSync(
  join(process.cwd(), "src/screens/foreman/hooks/useForemanSubcontractPdfActions.ts"),
  "utf8",
);

function sliceBetween(start: string, end: string) {
  const startIndex = pdfActionsSource.indexOf(start);
  const endIndex = pdfActionsSource.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return pdfActionsSource.slice(startIndex, endIndex);
}

describe("Foreman subcontract PDF preview guard wiring", () => {
  it("uses the lazy preview descriptor factory instead of the eager generated preview path", () => {
    expect(controllerSource).toContain("useForemanSubcontractPdfActions");
    expect(pdfActionsSource).toContain("prepareAndPreviewGeneratedPdfFromDescriptorFactory");
    expect(pdfActionsSource).not.toContain("await prepareAndPreviewGeneratedPdf({");
  });

  it("routes subcontract draft PDF descriptor creation through the lazy preview factory", () => {
    const onPdfSource = sliceBetween(
      "const onPdf = useCallback",
      "}, [closeSubcontractFlow, displayNo, foremanName, requestId, router]);",
    );

    expect(onPdfSource.indexOf("const createDescriptor = async () =>")).toBeGreaterThanOrEqual(0);
    expect(onPdfSource.indexOf("await prepareAndPreviewGeneratedPdfFromDescriptorFactory({"))
      .toBeGreaterThan(onPdfSource.indexOf("const createDescriptor = async () =>"));
    expect(onPdfSource).toContain("key: `pdf:subcontracts-request:${rid}`");
    expect(onPdfSource).toContain("createDescriptor,");
    expect(onPdfSource).toContain("onBeforeNavigate: closeSubcontractFlow");
    expect(onPdfSource).not.toContain("descriptor:");
  });

  it("routes subcontract request history PDF descriptor creation through the lazy preview factory", () => {
    const historyPdfSource = sliceBetween(
      "const openRequestHistoryPdf = useCallback",
      "}, [closeRequestHistory, foremanName, router]);",
    );

    expect(historyPdfSource.indexOf("const createDescriptor = async () =>")).toBeGreaterThanOrEqual(0);
    expect(historyPdfSource.indexOf("await prepareAndPreviewGeneratedPdfFromDescriptorFactory({"))
      .toBeGreaterThan(historyPdfSource.indexOf("const createDescriptor = async () =>"));
    expect(historyPdfSource).toContain("key: `pdf:history:${rid}`");
    expect(historyPdfSource).toContain("title: `Заявка ${rid}`");
    expect(historyPdfSource).toContain("createDescriptor,");
    expect(historyPdfSource).toContain("onBeforeNavigate: closeRequestHistory");
    expect(historyPdfSource).not.toContain("descriptor:");
  });

  it("keeps subcontract PDF and export copy readable", () => {
    expect(pdfActionsSource).toContain("title: displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`");
    expect(pdfActionsSource).toContain("title: `Заявка ${rid}`");
    expect(controllerSource).toContain("Экспорт Excel для подрядов будет добавлен.");
    expect(pdfActionsSource).not.toContain("Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С”");
    expect(pdfActionsSource).not.toContain("Р вЂ”Р В°РЎРЏР Р†Р С”Р В°");
    expect(controllerSource).not.toContain("Р В­Р С”РЎРѓР С—Р С•РЎР‚РЎвЂљ");
  });
});
