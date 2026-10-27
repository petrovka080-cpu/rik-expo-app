import { useCallback, useState } from "react";
import { activateCurrentUserAsContractor } from "../contractor.profileService";

export function useContractorActivation(params: {
  supabaseClient: any;
  reloadContractorScreenData: () => Promise<void>;
  code: string;
  onActivated?: () => void;
  onError?: (error: unknown) => void;
}) {
  const {
    supabaseClient,
    reloadContractorScreenData,
    code,
    onActivated,
    onError,
  } = params;
  const [activating, setActivating] = useState(false);

  const activateCode = useCallback(
    async () => {
      if (!String(code || "").trim()) return;

      try {
        setActivating(true);
        await activateCurrentUserAsContractor({ supabaseClient });
        onActivated?.();
        await reloadContractorScreenData();
      } catch (error) {
        onError?.(error);
      } finally {
        setActivating(false);
      }
    },
    [supabaseClient, onActivated, reloadContractorScreenData, onError, code],
  );

  return { activating, activateCode };
}
