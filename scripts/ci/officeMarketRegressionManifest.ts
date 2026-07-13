export type OfficeMarketCoverageKey =
  | "foreman"
  | "director"
  | "pdf"
  | "buyer"
  | "downstream"
  | "consumer"
  | "market"
  | "auth";

export type OfficeMarketRegressionPath = {
  path: string;
  kind: "dir" | "file";
  required: boolean;
  missingReason?: string;
};

export type OfficeMarketRegressionSuite = {
  name: string;
  owner: string;
  required: boolean;
  coverage: OfficeMarketCoverageKey[];
  paths: OfficeMarketRegressionPath[];
};

export const OFFICE_MARKET_REGRESSION_REQUIRED_COVERAGE: OfficeMarketCoverageKey[] = [
  "foreman",
  "director",
  "pdf",
  "buyer",
  "downstream",
  "consumer",
  "market",
  "auth",
];

export const OFFICE_MARKET_REGRESSION_SUITES: OfficeMarketRegressionSuite[] = [
  {
    name: "director-flow",
    owner: "office/director",
    required: true,
    coverage: ["director"],
    paths: [
      {
        path: "tests/director",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
      {
        path: "src/screens/director/director.lifecycle.scope.test.ts",
        kind: "file",
        required: true,
      },
    ],
  },
  {
    name: "buyer-procurement",
    owner: "office/buyer",
    required: true,
    coverage: ["buyer", "downstream"],
    paths: [
      {
        path: "tests/buyer",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
    ],
  },
  {
    name: "office-auth-downstream",
    owner: "office/runtime",
    required: true,
    coverage: ["auth", "downstream"],
    paths: [
      {
        path: "tests/office",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
      {
        path: "tests/app/office-warehouse-route-scope.test.tsx",
        kind: "file",
        required: true,
      },
    ],
  },
  {
    name: "director-pdf",
    owner: "office/pdf",
    required: true,
    coverage: ["pdf"],
    paths: [
      {
        path: "tests/pdf",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
    ],
  },
  {
    name: "consumer-repair",
    owner: "consumer/request",
    required: true,
    coverage: ["consumer"],
    paths: [
      {
        path: "tests/consumerRepair",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
      {
        path: "tests/architecture/consumerRepairNoHooks.contract.test.ts",
        kind: "file",
        required: true,
      },
    ],
  },
  {
    name: "market-media",
    owner: "market/media",
    required: true,
    coverage: ["market"],
    paths: [
      {
        path: "tests/market",
        kind: "dir",
        required: false,
        missingReason: "SKIPPED_MISSING_SUITE",
      },
      {
        path: "tests/marketAddScreen",
        kind: "dir",
        required: true,
      },
      {
        path: "tests/marketMedia",
        kind: "dir",
        required: true,
      },
    ],
  },
  {
    name: "market-my-listings",
    owner: "market/my-listings",
    required: true,
    coverage: ["market", "auth"],
    paths: [
      {
        path: "tests/marketMyListings",
        kind: "dir",
        required: true,
      },
    ],
  },
  {
    name: "office-estimate-chain",
    owner: "office/estimate",
    required: true,
    coverage: ["foreman", "buyer", "downstream"],
    paths: [
      {
        path: "tests/officeEstimate",
        kind: "dir",
        required: true,
      },
      {
        path: "tests/foremanAiEstimateChain",
        kind: "dir",
        required: true,
      },
    ],
  },
  {
    name: "foreman-composer",
    owner: "office/foreman",
    required: true,
    coverage: ["foreman"],
    paths: [
      {
        path: "src/screens/foreman/ForemanSubcontractTab.sections.test.tsx",
        kind: "file",
        required: true,
      },
      {
        path: "tests/foremanAiEstimate/foremanAiEstimateScreenEmbedding.contract.test.ts",
        kind: "file",
        required: true,
      },
      {
        path: "tests/foremanAiEstimateChain/legacyPickerRemovedFromForeman.contract.test.ts",
        kind: "file",
        required: true,
      },
    ],
  },
  {
    name: "platform-visible-markers-and-hotspots",
    owner: "platform/regression",
    required: true,
    coverage: ["auth", "downstream"],
    paths: [
      {
        path: "tests/architecture/globalLocalAndroidApi34Smoke.contract.test.ts",
        kind: "file",
        required: true,
      },
      {
        path: "tests/load/sLoadFix2Hotspots.contract.test.ts",
        kind: "file",
        required: true,
      },
    ],
  },
];
