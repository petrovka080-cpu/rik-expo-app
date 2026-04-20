import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";

export type ContractorPdfWork = {
  progress_id: string;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
};

export type ContractorPdfSelectedWork = {
  name: string;
  unit: string;
  price: number;
  qty?: number;
  comment?: string;
};

export type ContractorPdfMaterialRow = WorkMaterialRow & {
  act_used_qty?: number;
  unit?: string | null;
};

export type GenerateActPdfArgs = {
  mode: "normal" | "summary";
  work: ContractorPdfWork | null;
  materials: WorkMaterialRow[];
  actDate?: string | Date;
  selectedWorks?: ContractorPdfSelectedWork[];
  contractorName?: string | null;
  contractorInn?: string | null;
  contractorPhone?: string | null;
  customerName?: string | null;
  customerInn?: string | null;
  contractNumber?: string | null;
  contractDate?: string | null;
  zoneText?: string | null;
  mainWorkName?: string | null;
  actNumber?: string | null;
};

export type ContractorActPdfData = {
  mode: GenerateActPdfArgs["mode"];
  work: ContractorPdfWork;
  materials: ContractorPdfMaterialRow[];
  actNo: string;
  title: string;
  fileName: string;
  options: {
    actDate?: string | Date;
    selectedWorks?: ContractorPdfSelectedWork[];
    contractorName?: string | null;
    contractorInn?: string | null;
    contractorPhone?: string | null;
    customerName?: string | null;
    customerInn?: string | null;
    contractNumber?: string | null;
    contractDate?: string | null;
    zoneText?: string | null;
    mainWorkName?: string | null;
    actNumber?: string | null;
  };
};

export function prepareContractorActPdfData(
  args: GenerateActPdfArgs,
): ContractorActPdfData | null {
  if (!args.work) return null;

  const actNo = String(args.actNumber || args.work.progress_id.slice(0, 8));
  return {
    mode: args.mode,
    work: args.work,
    materials: args.materials as ContractorPdfMaterialRow[],
    actNo,
    title: `Act ${actNo}`,
    fileName: buildPdfFileName({
      documentType: "contractor_act",
      title: "contractor_act",
      entityId: actNo,
    }),
    options: {
      actDate: args.actDate,
      selectedWorks: args.selectedWorks,
      contractorName: args.contractorName,
      contractorInn: args.contractorInn,
      contractorPhone: args.contractorPhone,
      customerName: args.customerName,
      customerInn: args.customerInn,
      contractNumber: args.contractNumber,
      contractDate: args.contractDate,
      zoneText: args.zoneText,
      mainWorkName: args.mainWorkName,
      actNumber: args.actNumber,
    },
  };
}
