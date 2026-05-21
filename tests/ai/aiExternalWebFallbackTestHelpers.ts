import type {
  ExternalWebSearchResult,
  LiveAiQueryIntentSources,
} from "../../src/lib/ai/liveUi";

export const DOOR_WEB_RESULT: ExternalWebSearchResult = {
  id: "web-door-install-1",
  title: "Справочник монтажных работ: установка межкомнатной двери",
  snippetRu: "Типовой состав работ: полотно, коробка, наличники, фурнитура, монтаж, пена и крепёж.",
  url: "https://example.com/construction/door-install-estimate",
  sourceDomain: "example.com",
  checkedAt: "2026-05-20T00:00:00.000Z",
  confidence: "medium",
};

export const CONNECTED_WEB_SOURCES: LiveAiQueryIntentSources = {
  externalWeb: {
    enabled: true,
    results: [DOOR_WEB_RESULT],
  },
};

export const DISCONNECTED_WEB_SOURCES: LiveAiQueryIntentSources = {
  externalWeb: {
    enabled: false,
    exactReasonRu: "Интернет-поиск не подключён.",
  },
};
