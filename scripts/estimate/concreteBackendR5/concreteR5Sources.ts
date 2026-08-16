export type ConcreteR5OfficialSource = {
  sourceId: string;
  documentCode: string;
  titleRu: string;
  officialPageUrl: string;
  directPdfUrl?: string;
  role: "DESIGN" | "EXECUTION" | "RATES" | "REPAIR_RATES" | "PRICE" | "GOVERNANCE";
  status: "CURRENT" | "CURRENT_WITH_AMENDMENT";
};

export const CONCRETE_R5_OFFICIAL_SOURCES: readonly ConcreteR5OfficialSource[] = Object.freeze([
  { sourceId: "sn_kr_52_02_2024", documentCode: "СН КР 52-02:2024", titleRu: "Бетонные и железобетонные конструкции. Основные положения", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/228/show", directPdfUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/snkr52022024betonnyeizbk1_compressed-978668f565b409918.47605959.pdf", role: "DESIGN", status: "CURRENT" },
  { sourceId: "sn_kr_20_02_2024_order", documentCode: "СН КР 20-02:2024", titleRu: "Сейсмостойкое строительство. Нормы проектирования", officialPageUrl: "https://minstroy.gov.kg/ru/document/62/show", role: "DESIGN", status: "CURRENT_WITH_AMENDMENT" },
  { sourceId: "sn_kr_20_02_2024_amendment_1", documentCode: "СН КР 20-02:2024* / №75-нпа", titleRu: "Изменение к нормам сейсмостойкого строительства", officialPageUrl: "https://minstroy.gov.kg/ru/document/112/show", role: "DESIGN", status: "CURRENT" },
  { sourceId: "sp_kr_22_104_2024", documentCode: "СП КР 22-104:2024", titleRu: "Защита строительных конструкций и сооружений от коррозии", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/229/show", role: "EXECUTION", status: "CURRENT" },
  { sourceId: "sp_kr_52_101_2024", documentCode: "СП КР 52-101:2024", titleRu: "Производство сборных железобетонных конструкций и изделий", officialPageUrl: "https://minstroy.gov.kg/ru/document/143/show", directPdfUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/spkr521012024proizvodstvosbornzbkiizd-404674452b6f200d5.24499758.pdf", role: "EXECUTION", status: "CURRENT" },
  { sourceId: "sp_kr_50_103_2025", documentCode: "СП КР 50-103:2025", titleRu: "Основания и фундаменты", officialPageUrl: "https://minstroy.gov.kg/ru/document/161/show", role: "DESIGN", status: "CURRENT" },
  { sourceId: "sp_kr_51_101_2025", documentCode: "СП КР 51-101:2025", titleRu: "Армоцементные конструкции", officialPageUrl: "https://minstroy.gov.kg/ru/document/149/show", role: "DESIGN", status: "CURRENT" },
  { sourceId: "sp_kr_31_101_2024", documentCode: "СП КР 31-101:2024", titleRu: "Полы", officialPageUrl: "https://minstroy.gov.kg/ru/document/101/show", role: "EXECUTION", status: "CURRENT" },
  { sourceId: "krer_05_2015", documentCode: "КРЕР №5", titleRu: "Свайные работы. Опускные колодцы. Закрепление грунтов", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/421/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krer_06_2015", documentCode: "КРЕР №6", titleRu: "Бетонные и железобетонные конструкции монолитные", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/422/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krer_07_2015", documentCode: "КРЕР №7", titleRu: "Бетонные и железобетонные конструкции сборные", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/423/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krer_30_2015", documentCode: "КРЕР №30", titleRu: "Мосты и трубы", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/445/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krer_37_2015", documentCode: "КРЕР №37", titleRu: "Бетонные и железобетонные конструкции гидротехнических сооружений", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/450/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krer_46_2015", documentCode: "КРЕР №46", titleRu: "Работы при реконструкции зданий и сооружений", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/459/show", role: "RATES", status: "CURRENT" },
  { sourceId: "krerr_book_1_2015", documentCode: "КРЕРр 51–62", titleRu: "Ремонтно-строительные работы. Книга 1", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/414/show", role: "REPAIR_RATES", status: "CURRENT" },
  { sourceId: "krerr_book_2_2015", documentCode: "КРЕРр 63–69", titleRu: "Ремонтно-строительные работы. Книга 2", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/415/show", role: "REPAIR_RATES", status: "CURRENT" },
  { sourceId: "krerr_instructions_2015", documentCode: "Указания КРЕРр-2015", titleRu: "Указания по применению КРЕРр-2015", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/358/show", role: "GOVERNANCE", status: "CURRENT" },
  { sourceId: "krer_instructions_2015", documentCode: "Указания КРЕР-2015", titleRu: "Указания по применению КРЕР-2015", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/359/show", role: "GOVERNANCE", status: "CURRENT" },
  { sourceId: "price_book_05_2015", documentCode: "ССЦ Книга 5", titleRu: "Бетонные, железобетонные и гипсобетонные изделия", officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/256/show", role: "PRICE", status: "CURRENT" },
]);
