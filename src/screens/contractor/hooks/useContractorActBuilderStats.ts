import { useMemo } from "react";

type ActBuilderLoadState = "init" | "loading" | "ready" | "error";

type WithCalcFields = {
  include: boolean;
  qty?: number | string | null;
  price?: number | string | null;
};

export function useContractorActBuilderStats(params: {
  actBuilderItems: WithCalcFields[];
  actBuilderWorks: WithCalcFields[];
  actBuilderLoadState: ActBuilderLoadState;
}) {
  const { actBuilderItems, actBuilderWorks, actBuilderLoadState } = params;

  const actBuilderSelectedMatCount = useMemo(
    () => actBuilderItems.filter((x) => x.include).length,
    [actBuilderItems],
  );
  const actBuilderSelectedWorkCount = useMemo(
    () => actBuilderWorks.filter((x) => x.include).length,
    [actBuilderWorks],
  );
  const actBuilderHasSelected = useMemo(
    () => actBuilderSelectedMatCount + actBuilderSelectedWorkCount > 0,
    [actBuilderSelectedMatCount, actBuilderSelectedWorkCount],
  );
  const actBuilderCanSubmit = useMemo(
    () => actBuilderLoadState === "ready" && actBuilderHasSelected,
    [actBuilderLoadState, actBuilderHasSelected],
  );
  const actBuilderDateText = useMemo(() => new Date().toLocaleDateString("ru-RU"), []);

  const actBuilderWorkSum = useMemo(
    () =>
      actBuilderWorks
        .filter((x) => x.include)
        .reduce((acc, x) => {
          const qty = Number(x.qty || 0);
          const price = Number(x.price || 0);
          if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
          return acc + qty * price;
        }, 0),
    [actBuilderWorks],
  );

  const actBuilderMatSum = useMemo(
    () =>
      actBuilderItems
        .filter((x) => x.include)
        .reduce((acc, x) => {
          const qty = Number(x.qty || 0);
          const price = Number(x.price || 0);
          if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
          return acc + qty * price;
        }, 0),
    [actBuilderItems],
  );

  return {
    actBuilderSelectedMatCount,
    actBuilderSelectedWorkCount,
    actBuilderHasSelected,
    actBuilderCanSubmit,
    actBuilderDateText,
    actBuilderWorkSum,
    actBuilderMatSum,
  };
}
