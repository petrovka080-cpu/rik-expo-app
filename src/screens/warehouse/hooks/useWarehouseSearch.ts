import { useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

export function useWarehouseSearch() {
  const [stockSearch, setStockSearch] = useState<string>("");
  const stockSearchDeb = useDebouncedValue(stockSearch, 180);

  return {
    stockSearch,
    setStockSearch,
    stockSearchDeb,
  };
}

