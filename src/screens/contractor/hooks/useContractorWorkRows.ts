import { useMemo } from "react";
import type { ContractorProfileCard } from "../contractor.profileService";
import type { ContractorWorkRow } from "../contractor.loadWorksService";

type Params = {
  rows: ContractorWorkRow[];
  contractor: ContractorProfileCard | null;
  manualClaimedJobIds: string[];
  isActiveWork: (row: ContractorWorkRow) => boolean;
};

export function useContractorWorkRows(params: Params) {
  const { rows, contractor, manualClaimedJobIds, isActiveWork } = params;

  const claimedJobIds = useMemo(() => {
    if (!contractor) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.contractor_id === contractor.id)
        .map((r) => String(r.contractor_job_id || "").trim())
        .filter(Boolean)
        .concat(manualClaimedJobIds),
    );
  }, [rows, contractor, manualClaimedJobIds]);

  const availableRows = useMemo(() => {
    return rows.filter((r) => {
      const jobId = String(r.contractor_job_id || "").trim();
      if (jobId && claimedJobIds.has(jobId)) return false;
      if (r.contractor_id) return false;
      if (!isActiveWork(r)) return false;

      const code = (r.work_code || "").toUpperCase();
      if (code.startsWith("MAT-") || code.startsWith("KIT-")) return false;

      return true;
    });
  }, [rows, claimedJobIds, isActiveWork]);

  const myRows = useMemo(() => {
    if (!contractor) return [];
    return rows.filter((r) => {
      if (r.contractor_id === contractor.id) return true;
      const jobId = String(r.contractor_job_id || "").trim();
      return !!jobId && claimedJobIds.has(jobId);
    });
  }, [rows, contractor, claimedJobIds]);

  return { claimedJobIds, availableRows, myRows };
}
