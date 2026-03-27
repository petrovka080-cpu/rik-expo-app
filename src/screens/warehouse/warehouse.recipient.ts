// src/screens/warehouse/warehouse.recipient.ts
import { useCallback, useEffect, useMemo } from "react";
import { loadJson, loadString, saveJson, saveString } from "./warehouse.utils";
import type { Option } from "./warehouse.types";
import { useWarehouseUiStore } from "./warehouseUi.store";

const RECIPIENT_KEY = "wh:lastRecipient";
const RECIPIENT_RECENT_KEY = "wh:recentRecipients";

export function useWarehouseRecipient(args: {
  enabled: boolean;
  recipientList: Option[];
}) {
  const { enabled, recipientList } = args;

  const recipientText = useWarehouseUiStore((state) => state.recipientText);
  const setRecipientText = useWarehouseUiStore((state) => state.setRecipientText);
  const recipientSuggestOpen = useWarehouseUiStore((state) => state.recipientSuggestOpen);
  const setRecipientSuggestOpen = useWarehouseUiStore((state) => state.setRecipientSuggestOpen);
  const recipientRecent = useWarehouseUiStore((state) => state.recipientRecent);
  const setRecipientRecent = useWarehouseUiStore((state) => state.setRecipientRecent);


  useEffect(() => {
    if (!enabled) return;

    (async () => {
      const last = (await loadString(RECIPIENT_KEY)) ?? "";
      const recent = await loadJson<string[]>(RECIPIENT_RECENT_KEY, []);
      if (last) {
        setRecipientText((prev) => (String(prev ?? "").trim() ? prev : last));
      }
      setRecipientRecent(Array.isArray(recent) ? recent : []);
    })().catch((e) => {
      if (__DEV__) {
        console.warn("[warehouse.recipient] bootstrap failed", e);
      }
    });

  }, [enabled, setRecipientRecent, setRecipientText]);

  const recipientSuggestions = useMemo(() => {
    const recent = recipientRecent || [];
    const fromProfiles = (recipientList || [])
      .map((x) => x?.label)
      .filter(Boolean)
      .map((x) => String(x));

    // Return union of recent and profiles, limited to 100 for safety
    return Array.from(new Set([...recent, ...fromProfiles])).slice(0, 100);
  }, [recipientRecent, recipientList]);

  const commitRecipient = useCallback(async (name: string) => {
    const t = String(name ?? "").trim();
    if (!t) return;

    setRecipientText(t);
    setRecipientSuggestOpen(false);

    setRecipientRecent((prev) => {
      // Increase history size to 50
      const next = [t, ...(prev || []).filter((x) => x !== t)].slice(0, 50);
      void saveJson(RECIPIENT_RECENT_KEY, next);
      return next;
    });

    void saveString(RECIPIENT_KEY, t);
  }, [setRecipientRecent, setRecipientSuggestOpen, setRecipientText]);

  return {
    recipientText,
    setRecipientText,
    recipientSuggestOpen,
    setRecipientSuggestOpen,
    recipientSuggestions,
    commitRecipient,
  };
}
