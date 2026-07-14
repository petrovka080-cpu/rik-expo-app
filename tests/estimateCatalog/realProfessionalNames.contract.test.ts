import { readFileSync } from "node:fs";
import path from "node:path";

type WorkCatalog = {
  items: Array<{
    work_catalog_item_id: string;
    professional_name_ru: string;
    work_key: string;
  }>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("real professional catalog names", () => {
  it("does not expose generic row or raw template labels as professional work names", () => {
    const catalog = readJson<WorkCatalog>("data/estimate-catalog/work-items/work-catalog-10000.json");
    const forbidden = [/^Материалы$/i, /^Работы$/i, /^generic /i, /_professional_expanded_v1$/i];

    expect(catalog.items).toHaveLength(10000);
    expect(catalog.items.every((item) => item.work_catalog_item_id && item.professional_name_ru.trim())).toBe(true);
    expect(catalog.items.some((item) => forbidden.some((pattern) => pattern.test(item.professional_name_ru)))).toBe(false);
  });
});
