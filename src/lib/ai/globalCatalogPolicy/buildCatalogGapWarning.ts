export function buildCatalogGapWarning(materialKey: string, catalogRegion: string): string {
  return `Нет проверенного catalog_items кандидата для ${materialKey} в регионе ${catalogRegion}; нужен ручной выбор материала.`;
}
