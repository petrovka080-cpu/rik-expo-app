import { create } from "zustand";
import type { DirectorReportFetchMeta } from "../../lib/api/director_reports";
import type { RepTab } from "./director.types";

export type DirectorReportsBranchStage = "options" | "report" | "discipline";

export type DirectorObservedBranchMeta = DirectorReportFetchMeta & {
  observedAt: number;
  scopeKey: string;
  fromCache: boolean;
};

export type DirectorReportsBranchMetaState = Record<
  DirectorReportsBranchStage,
  DirectorObservedBranchMeta | null
>;

export const createDirectorReportsBranchMetaState = (): DirectorReportsBranchMetaState => ({
  options: null,
  report: null,
  discipline: null,
});

type DirectorReportsUiStore = {
  repOpen: boolean;
  repPeriodOpen: boolean;
  repObjOpen: boolean;
  repTab: RepTab;
  repFrom: string | null;
  repTo: string | null;
  repObjectName: string | null;
  repLoading: boolean;
  repDisciplinePriceLoading: boolean;
  repOptLoading: boolean;
  repBranchMeta: DirectorReportsBranchMetaState;
  setRepOpen: (value: boolean) => void;
  setRepPeriodOpen: (value: boolean) => void;
  setRepObjOpen: (value: boolean) => void;
  setRepTab: (value: RepTab) => void;
  setReportPeriod: (from: string | null, to: string | null) => void;
  setRepObjectName: (value: string | null) => void;
  setRepLoading: (value: boolean) => void;
  setRepDisciplinePriceLoading: (value: boolean) => void;
  setRepOptLoading: (value: boolean) => void;
  setRepBranchStage: (stage: DirectorReportsBranchStage, value: DirectorObservedBranchMeta | null) => void;
  resetRepBranchMeta: () => void;
  closeReportsUi: () => void;
};

export const useDirectorReportsUiStore = create<DirectorReportsUiStore>((set) => ({
  repOpen: false,
  repPeriodOpen: false,
  repObjOpen: false,
  repTab: "materials",
  repFrom: null,
  repTo: null,
  repObjectName: null,
  repLoading: false,
  repDisciplinePriceLoading: false,
  repOptLoading: false,
  repBranchMeta: createDirectorReportsBranchMetaState(),
  setRepOpen: (value) => set({ repOpen: value }),
  setRepPeriodOpen: (value) => set({ repPeriodOpen: value }),
  setRepObjOpen: (value) => set({ repObjOpen: value }),
  setRepTab: (value) => set({ repTab: value }),
  setReportPeriod: (repFrom, repTo) => set({ repFrom, repTo }),
  setRepObjectName: (value) => set({ repObjectName: value }),
  setRepLoading: (value) => set({ repLoading: value }),
  setRepDisciplinePriceLoading: (value) => set({ repDisciplinePriceLoading: value }),
  setRepOptLoading: (value) => set({ repOptLoading: value }),
  setRepBranchStage: (stage, value) =>
    set((state) => ({
      repBranchMeta: {
        ...state.repBranchMeta,
        [stage]: value,
      },
    })),
  resetRepBranchMeta: () => set({ repBranchMeta: createDirectorReportsBranchMetaState() }),
  closeReportsUi: () =>
    set({
      repOpen: false,
      repPeriodOpen: false,
      repObjOpen: false,
    }),
}));
