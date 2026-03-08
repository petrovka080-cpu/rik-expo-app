import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { RefOption } from "../foreman.types";
import { getRecentForemanCodes, pushRecentForemanCode, rankForemanOptions } from "../foreman.search";

type Params = {
  fieldKey: string;
  options: RefOption[];
  value: string;
  onChange: (code: string) => void;
};

const ITEM_ROW_HEIGHT = 53;

export function useForemanDropdownModel({ fieldKey, options, value, onChange }: Params) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [recentCodes, setRecentCodes] = useState<string[]>(() => getRecentForemanCodes(fieldKey));

  const picked = useMemo(() => options.find((o) => o.code === value), [options, value]);

  const filtered = useMemo(() => {
    return rankForemanOptions({
      query: deferredQuery,
      options,
      selectedCode: value,
      recentCodes,
    });
  }, [deferredQuery, options, recentCodes, value]);

  const openModal = useCallback(() => {
    setRecentCodes(getRecentForemanCodes(fieldKey));
    setOpen(true);
  }, [fieldKey]);

  const closeModal = useCallback(() => {
    setQuery("");
    setOpen(false);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);

  const pickCode = useCallback(
    (code: string) => {
      onChange(code);
      setRecentCodes(pushRecentForemanCode(fieldKey, code));
      setQuery("");
      setOpen(false);
    },
    [fieldKey, onChange],
  );

  const resetSelection = useCallback(() => {
    onChange("");
    setQuery("");
    setOpen(false);
  }, [onChange]);

  const keyExtractor = useCallback((item: RefOption, idx: number) => `ref:${item.code}:${idx}`, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<RefOption> | null | undefined, index: number) => ({
      length: ITEM_ROW_HEIGHT,
      offset: ITEM_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  return {
    open,
    query,
    setQuery,
    picked,
    filtered,
    openModal,
    closeModal,
    clearSearch,
    pickCode,
    resetSelection,
    keyExtractor,
    getItemLayout,
  };
}
