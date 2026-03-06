import { useEffect, useState } from "react";

import { listSuppliers, type Supplier } from "../../../lib/catalog_api";

export function useBuyerSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (suppliersLoaded) return;
      try {
        const list = await listSuppliers();
        setSuppliers(list);
        setSuppliersLoaded(true);
      } catch (error) {
        console.warn("[buyer] suppliers load failed", error);
      }
    })();
  }, [suppliersLoaded]);

  return { suppliers };
}

