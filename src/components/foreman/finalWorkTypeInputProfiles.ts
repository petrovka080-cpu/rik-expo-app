import {
  FINAL_WORK_TYPE_INPUT_MATRIX,
  type FinalWorkTypeInputProfile as MatrixProfile,
} from "./finalWorkTypeInputMatrix";

export type FinalWorkTypeInputProfile = {
  workTypeCode: string;
  core: string[];
  engineering?: string[];
  derived?: string[];
  hidden?: string[];
  labels?: Record<string, string>;
  notes?: string;
};

const toProfile = (p: MatrixProfile): FinalWorkTypeInputProfile => ({
  workTypeCode: p.workTypeCode,
  core: Array.from(p.core),
  engineering: p.engineering ? Array.from(p.engineering) : undefined,
  derived: p.derived ? Array.from(p.derived) : undefined,
  hidden: p.hidden ? Array.from(p.hidden) : undefined,
  labels: p.labels,
  notes: p.notes,
});

export const FINAL_WORK_TYPE_INPUT_PROFILES: FinalWorkTypeInputProfile[] =
  Object.values(FINAL_WORK_TYPE_INPUT_MATRIX).map(toProfile);

export const FINAL_WORK_TYPE_INPUT_PROFILE_MAP: Record<string, FinalWorkTypeInputProfile> =
  Object.fromEntries(
    FINAL_WORK_TYPE_INPUT_PROFILES.map((item) => [
      String(item.workTypeCode).trim(),
      item,
    ]),
  );
