import { readFileSync } from "fs";
import { join } from "path";

const controllerSource = readFileSync(
  join(process.cwd(), "src/screens/foreman/hooks/useForemanSubcontractController.tsx"),
  "utf8",
);

function sliceBetween(start: string, end: string) {
  const startIndex = controllerSource.indexOf(start);
  const endIndex = controllerSource.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return controllerSource.slice(startIndex, endIndex);
}

describe("Foreman subcontract PDF preview guard wiring", () => {
  it("uses the lazy preview descriptor factory instead of the eager generated preview path", () => {
    expect(controllerSource).toContain("prepareAndPreviewGeneratedPdfFromDescriptorFactory");
    expect(controllerSource).not.toContain("await prepareAndPreviewGeneratedPdf({");
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
});
