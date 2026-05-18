import type {
  RepDisciplinePayload,
  RepPayload,
  RepTab,
} from "./director.types";

export type DirectorReportsModalProps = {
  visible: boolean;
  onClose: () => void;
  repData: RepPayload | null;
  repDiscipline: RepDisciplinePayload | null;
  repPeriodShort: string;
  repLoading: boolean;
  repDisciplinePriceLoading: boolean;
  repPeriodOpen: boolean;
  onOpenPeriod: () => void;
  onClosePeriod: () => void;
  repFrom: string | null;
  repTo: string | null;
  onApplyPeriod: (from: string, to: string) => void;
  onClearPeriod: () => void;
  repObjOpen: boolean;
  onCloseRepObj: () => void;
  repOptObjects: string[];
  applyObjectFilter: (name: string | null) => Promise<void>;
  repObjectName: string | null;
  onOpenRepObj: () => void;
  repOptLoading: boolean;
  repTab: RepTab;
  setRepTab: (t: RepTab) => void;
  onRefresh: () => Promise<void>;
  onExportProductionPdf?: () => Promise<void> | void;
  onExportSubcontractPdf?: () => Promise<void> | void;
};
