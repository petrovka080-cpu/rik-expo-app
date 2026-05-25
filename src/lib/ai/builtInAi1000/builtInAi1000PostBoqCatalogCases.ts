import type { BuiltInAiScreenContext } from "../builtInAi";
import {
  BUILT_IN_AI_1000_CATEGORY_SUMMARY,
  BUILT_IN_AI_1000_CONSTRUCTION_CASES,
  type BuiltInAi1000Case,
} from "./builtInAi1000ConstructionCases";

export type BuiltInAi1000PostBoqRoute =
  | "/chat"
  | "/request"
  | "/ai?context=foreman"
  | "/product/search"
  | "/pdf-viewer";

export type BuiltInAi1000PostBoqAnchor =
  | "strip_foundation"
  | "brick_masonry"
  | "gable_roof_installation"
  | "asphalt_paving"
  | "carpet_laying"
  | "ceramic_tile_floor_laying"
  | "drywall_wall_cladding"
  | "laminate_laying"
  | "rebar_product_search"
  | "asphalt_supplier_search"
  | "estimate_to_pdf";

export type BuiltInAi1000PostBoqCase = BuiltInAi1000Case & {
  postBoqRoute: BuiltInAi1000PostBoqRoute;
  postBoqScreenContext: BuiltInAiScreenContext;
  postBoqRole: string;
  postBoqAnchor?: BuiltInAi1000PostBoqAnchor;
  expectedConcreteVolumeM3?: number;
  minimumBoqRows?: number;
  requiresRequestPayloadParity?: boolean;
  requiresPdfPayload?: boolean;
};

export const BUILT_IN_AI_1000_POST_BOQ_WAVE =
  "S_BUILT_IN_AI_1000_REAL_OUTPUT_AFTER_BOQ_CATALOG_CORE_POINT_OF_NO_RETURN";

export const BUILT_IN_AI_1000_POST_BOQ_GREEN_STATUS =
  "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY";

export const BUILT_IN_AI_1000_POST_BOQ_PREFIX =
  "S_BUILT_IN_AI_1000_POST_BOQ_CATALOG";

export const STRIP_FOUNDATION_48M_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d 48 \u043c\u0435\u0442\u0440\u043e\u0432 \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c, \u0438 \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";

const CASE_OVERRIDES: Record<string, Partial<BuiltInAi1000PostBoqCase>> = {
  "0001": {
    postBoqAnchor: "laminate_laying",
  },
  "0008": {
    postBoqRoute: "/request",
    postBoqScreenContext: "request",
    postBoqRole: "consumer",
    postBoqAnchor: "carpet_laying",
    requiresRequestPayloadParity: true,
  },
  "0051": {
    postBoqRoute: "/request",
    postBoqScreenContext: "request",
    postBoqRole: "consumer",
    postBoqAnchor: "ceramic_tile_floor_laying",
    requiresRequestPayloadParity: true,
    minimumBoqRows: 8,
  },
  "0401": {
    postBoqAnchor: "gable_roof_installation",
    minimumBoqRows: 10,
  },
  "0501": {
    promptRu: STRIP_FOUNDATION_48M_PROMPT,
    volume: 48,
    unit: "linear_m",
    postBoqRoute: "/request",
    postBoqScreenContext: "request",
    postBoqRole: "consumer",
    postBoqAnchor: "strip_foundation",
    expectedConcreteVolumeM3: 32.64,
    minimumBoqRows: 12,
    requiresRequestPayloadParity: true,
    requiresPdfPayload: true,
  },
  "0551": {
    postBoqAnchor: "brick_masonry",
    minimumBoqRows: 8,
  },
  "0160": {
    promptRu:
      "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043e\u0431\u0448\u0438\u0432\u043a\u0443 \u0441\u0442\u0435\u043d \u0413\u041a\u041b 352 \u043c\u00b2",
    volume: 352,
    postBoqAnchor: "drywall_wall_cladding",
    minimumBoqRows: 8,
  },
  "0701": {
    promptRu:
      "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 1000 \u043c\u00b2",
    volume: 1000,
    postBoqRoute: "/ai?context=foreman",
    postBoqScreenContext: "foreman",
    postBoqRole: "foreman",
    postBoqAnchor: "asphalt_paving",
    minimumBoqRows: 10,
  },
  "0972": {
    postBoqAnchor: "rebar_product_search",
  },
  "0992": {
    postBoqAnchor: "asphalt_supplier_search",
  },
  "0999": {
    postBoqRoute: "/pdf-viewer",
    postBoqScreenContext: "chat",
    postBoqRole: "unknown",
    postBoqAnchor: "estimate_to_pdf",
    requiresPdfPayload: true,
  },
};

function defaultRouteFor(testCase: BuiltInAi1000Case): Pick<
  BuiltInAi1000PostBoqCase,
  "postBoqRoute" | "postBoqScreenContext" | "postBoqRole"
> {
  if (testCase.productSearchCompanion) {
    return {
      postBoqRoute: "/product/search",
      postBoqScreenContext: "marketplace",
      postBoqRole: "buyer",
    };
  }
  return {
    postBoqRoute: "/chat",
    postBoqScreenContext: "chat",
    postBoqRole: "unknown",
  };
}

function withPostBoqContract(testCase: BuiltInAi1000Case): BuiltInAi1000PostBoqCase {
  const defaults = defaultRouteFor(testCase);
  const override = CASE_OVERRIDES[testCase.id] ?? {};
  return {
    ...testCase,
    ...defaults,
    ...override,
  };
}

export const BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES: readonly BuiltInAi1000PostBoqCase[] =
  BUILT_IN_AI_1000_CONSTRUCTION_CASES.map(withPostBoqContract);

if (BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length !== 1000) {
  throw new Error(`BUILT_IN_AI_1000_POST_BOQ_CASES_COUNT_INVALID:${BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length}`);
}

export const BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES: readonly BuiltInAi1000PostBoqCase[] =
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((testCase) =>
    !testCase.productSearchCompanion && testCase.postBoqAnchor !== "estimate_to_pdf",
  );

export const BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES: readonly BuiltInAi1000PostBoqCase[] =
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((testCase) =>
    testCase.productSearchCompanion && testCase.postBoqAnchor !== "estimate_to_pdf",
  );

export const BUILT_IN_AI_1000_POST_BOQ_PDF_CASES: readonly BuiltInAi1000PostBoqCase[] =
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((testCase) => testCase.postBoqAnchor === "estimate_to_pdf");

export const BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS: readonly BuiltInAi1000PostBoqAnchor[] = [
  "strip_foundation",
  "brick_masonry",
  "gable_roof_installation",
  "asphalt_paving",
  "carpet_laying",
  "ceramic_tile_floor_laying",
  "drywall_wall_cladding",
  "laminate_laying",
  "rebar_product_search",
  "asphalt_supplier_search",
  "estimate_to_pdf",
];

export const BUILT_IN_AI_1000_POST_BOQ_CATEGORY_SUMMARY = BUILT_IN_AI_1000_CATEGORY_SUMMARY;
