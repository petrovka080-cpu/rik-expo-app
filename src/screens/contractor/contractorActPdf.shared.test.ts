import {
  buildContractorActClientSourceFingerprint,
  buildContractorActManifestContract,
} from "./contractorActPdf.shared";
import type { ContractorActPdfData } from "./contractorPdf.data";

const baseData: ContractorActPdfData = {
  mode: "normal",
  work: {
    progress_id: "progress-1",
    work_code: "W-1",
    work_name: "Concrete",
    object_name: "Tower A",
  },
  materials: [
    {
      material_id: "mat-1",
      mat_code: "M-1",
      name: "Cement",
      uom: "bag",
      qty: 2,
      qty_fact: 2,
      available: 0,
      price: 100,
    },
  ],
  actNo: "ACT-1",
  title: "Act ACT-1",
  fileName: "contractor_act_ACT-1.pdf",
  options: {
    actDate: "2026-04-20",
    selectedWorks: [
      {
        name: "Pour concrete",
        unit: "m3",
        price: 500,
        qty: 3,
        comment: "Level 2",
      },
    ],
    contractorName: "Contractor LLC",
    contractorInn: "123",
    customerName: "Tower A",
    contractNumber: "CN-1",
    contractDate: "2026-01-01",
    zoneText: "Zone 1 / Level 2",
    mainWorkName: "Concrete",
    actNumber: "ACT-1",
  },
};

describe("contractor act PDF manifest contract (PDF-Z5)", () => {
  it("keeps the same client fingerprint and versions for the same business data", () => {
    const firstFingerprint = buildContractorActClientSourceFingerprint(baseData);
    const secondFingerprint = buildContractorActClientSourceFingerprint(
      JSON.parse(JSON.stringify(baseData)),
    );
    const first = buildContractorActManifestContract(baseData);
    const second = buildContractorActManifestContract(JSON.parse(JSON.stringify(baseData)));

    expect(secondFingerprint).toBe(firstFingerprint);
    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("contractor/act/artifacts/v1/");
    expect(first.manifestPath).toContain("contractor/act/manifests/v1/");
    expect(first.status).toBe("ready");
  });

  it("changes source and artifact versions when visible PDF data changes", () => {
    const first = buildContractorActManifestContract(baseData);
    const changed = buildContractorActManifestContract({
      ...baseData,
      materials: [
        {
          ...baseData.materials[0],
          qty_fact: 4,
        },
      ],
    });

    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
  });

  it("ignores transport and row metadata noise that is not rendered into the PDF", () => {
    const first = buildContractorActManifestContract(baseData);
    const noisy = buildContractorActManifestContract({
      ...baseData,
      materials: [
        {
          ...baseData.materials[0],
          mat_code: "M-TRANSPORT-ONLY",
          material_id: "client-row-999",
          available: 999,
          _debug: "trace-1",
        } as typeof baseData.materials[number] & { _debug: string },
      ],
      options: {
        ...baseData.options,
        selectedWorks: baseData.options.selectedWorks?.map((work) => ({
          ...work,
          _debug: "trace-2",
        })) as typeof baseData.options.selectedWorks,
      },
    });

    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });
});
