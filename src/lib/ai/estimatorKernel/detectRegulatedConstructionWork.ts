import { normalizeDimensionText } from "../constructionFormulas";
import type { RegulatedConstructionWorkPolicy } from "./regulatedWorkTypes";

const warnings = {
  elevator: [
    "Работы выполняет только лицензированная организация.",
    "Нужны параметры шахты, грузоподъемность, скорость, количество остановок и местная инспекция.",
    "Смета предварительная и не является разрешением на монтаж.",
  ],
  hydropower: [
    "Нужен профильный подрядчик по гидроэнергетическому оборудованию.",
    "Нужны напор, расход, схема подключения, требования инспекции и проектная экспертиза.",
    "Смета не заменяет разрешения, проект и пуско-наладочную программу.",
  ],
  safety: [
    "Нужен профильный специалист и соблюдение местных требований.",
    "Смета не содержит DIY-инструкций и не подтверждает разрешения.",
  ],
} as const;

export function detectRegulatedConstructionWork(text: string): RegulatedConstructionWorkPolicy {
  const normalized = normalizeDimensionText(text);
  if (/лифт|elevator/.test(normalized)) {
    return { regulated: true, kind: "passenger_elevator", warnings: [...warnings.elevator] };
  }
  if (/эскалатор|escalator/.test(normalized)) {
    return { regulated: true, kind: "escalator", warnings: [...warnings.safety] };
  }
  if (/газ|gas/.test(normalized)) {
    return { regulated: true, kind: "gas_system", warnings: [...warnings.safety] };
  }
  if (/высок(?:ое|ого)?\s+напряж|high\s+voltage/.test(normalized)) {
    return { regulated: true, kind: "high_voltage", warnings: [...warnings.safety] };
  }
  if (/котел|котельн|boiler/.test(normalized)) {
    return { regulated: true, kind: "boiler", warnings: [...warnings.safety] };
  }
  if (/кран|кран-балк|тельфер|грузоподъем|industrial\s+crane/.test(normalized)) {
    return { regulated: true, kind: "industrial_crane", warnings: [...warnings.safety] };
  }
  if (/пожарн|fire\s+alarm|fire\s+safety/.test(normalized)) {
    return { regulated: true, kind: "fire_alarm", warnings: [...warnings.safety] };
  }
  if (/гэс|гидро|hydro|hydropower|турбин/.test(normalized)) {
    return { regulated: true, kind: "hydropower_equipment", warnings: [...warnings.hydropower] };
  }
  if (/снос|демонтаж.*несущ|structural\s+demolition/.test(normalized)) {
    return { regulated: true, kind: "structural_demolition", warnings: [...warnings.safety] };
  }
  if (/асбест|hazardous|опасн/.test(normalized)) {
    return { regulated: true, kind: "hazardous_materials", warnings: [...warnings.safety] };
  }
  return { regulated: false, warnings: [] };
}
