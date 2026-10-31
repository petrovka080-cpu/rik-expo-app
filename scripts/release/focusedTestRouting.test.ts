import { readFileSync } from "node:fs";
import path from "node:path";
import { assertExactFocusedJestResults, planFocusedTests } from "./focusedTestRouting";

const plan = (sources: Record<string, string>, files = Object.keys(sources), deleted: string[] = []) =>
  planFocusedTests(files, file => sources[file], deleted);

test("retains every runnable staged test while routing real node imports separately from Jest", () => {
  const sources = {
    "domain.test.ts": "import test from 'node:test'; test('native', () => {});",
    "view.test.tsx": "test('mounted', () => {});",
    "dto.contract.ts": "export type Dto = { id: string }; export const revision = 1;",
  };
  expect(plan(sources, [...Object.keys(sources), "removed.test.ts"], ["removed.test.ts"])).toEqual({
    nodeFiles: ["domain.test.ts"], jestFiles: ["view.test.tsx"],
    nonTestContractFiles: ["dto.contract.ts"], removedTestFiles: ["removed.test.ts"],
  });
});

test("comments, strings and type-only node imports cannot divert actual Jest registrations", () => {
  const sources = { "jest.test.ts": "// import test from 'node:test';\nconst documentation = \"node:test\"; import type { TestContext } from 'node:test'; test('actual Jest', () => {});" };
  expect(plan(sources).jestFiles).toEqual(["jest.test.ts"]);
  expect(plan(sources).nodeFiles).toEqual([]);
});

test("require, import-equals and dynamic node loaders retain their native test routes", () => {
  const sources = {
    "require.test.ts": "const test = require('node:test'); test('a', () => {});",
    "equals.test.ts": "import test = require('node:test'); test('a', () => {});",
    "dynamic.test.ts": "const { test } = await import('node:test'); test('a', () => {});",
  };
  expect(plan(sources).nodeFiles).toEqual(Object.keys(sources).sort());
});

test("an executable contract file remains an obligation even if Jest configuration would ignore it", () => {
  expect(plan({ "suite.contract.ts": "test('required', () => {});" }).jestFiles).toEqual(["suite.contract.ts"]);
  expect(() => plan({}, ["unexpected.test.ts"])).toThrow("STAGED_TEST_SOURCE_MISSING");
  expect(() => plan({ "mixed.test.ts": "import test from 'node:test'; import { expect } from '@jest/globals';" })).toThrow("MIXED_TEST_FRAMEWORKS");
});

test("actual Jest JSON must include every requested suite, not merely return success for a partial batch", () => {
  const root = process.cwd(), expected = ["a.test.ts", "b.test.ts"];
  const suite = (file: string) => ({ name: path.resolve(root, file), status: "passed" });
  const full = { success: true, numTotalTestSuites: 2, testResults: expected.map(suite) };
  expect(() => assertExactFocusedJestResults(root, expected, full)).not.toThrow();
  expect(() => assertExactFocusedJestResults(root, expected, { success: true, numTotalTestSuites: 1, testResults: [suite("a.test.ts")] })).toThrow("FOCUSED_JEST_SUITE_COVERAGE");
  expect(() => assertExactFocusedJestResults(root, expected, { ...full, testResults: [suite("a.test.ts"), suite("other.test.ts")] })).toThrow("FOCUSED_JEST_SUITE_COVERAGE");
  expect(() => assertExactFocusedJestResults(root, expected, { ...full, testResults: [suite("a.test.ts"), suite("a.test.ts")] })).toThrow("FOCUSED_JEST_SUITE_COVERAGE");
  // An existing legal pending suite is reported, never reclassified as missing or PASS.
  expect(() => assertExactFocusedJestResults(root, expected, { ...full, testResults: [suite("a.test.ts"), { ...suite("b.test.ts"), status: "pending" }] })).not.toThrow();
});

// These real module forms were previously hidden as non-test contracts.
test("a side-effect import in a contract remains runnable", () => {
  expect(plan({ "register.contract.ts": "import './register-suite';" }).jestFiles).toEqual(["register.contract.ts"]);
});

test("aliased registration in a variable initializer cannot be excluded as DTO", () => {
  expect(plan({ "alias.contract.ts": "const run = test; const result = run('required', () => {});" }).jestFiles).toEqual(["alias.contract.ts"]);
});

test("retains staged JavaScript suites and routes native mjs/cjs through their actual loaders", () => {
  const sources = {
    "plain.test.js": "const { test } = require('@jest/globals'); test('Jest', () => {});",
    "common.test.cjs": "const { test } = require('@jest/globals'); test('Jest CJS', () => {});",
    "native.test.mjs": "import test from 'node:test'; test('native', () => {});",
    "native.contract.cjs": "const test = require('node:test'); test('native CJS', () => {});",
    "dto.contract.js": "export const revision = 1;",
  };
  expect(plan(sources, [...Object.keys(sources), "removed.test.js"], ["removed.test.js"])).toEqual({
    jestFiles: ["common.test.cjs", "plain.test.js"],
    nodeFiles: ["native.contract.cjs", "native.test.mjs"],
    nonTestContractFiles: ["dto.contract.js"], removedTestFiles: ["removed.test.js"],
  });
  expect(() => plan({}, ["undeclared.test.cjs"])).toThrow("STAGED_TEST_SOURCE_MISSING");
});

test("JSX text is not a native loader and browser spec files do not enter the unit route", () => {
  const sources = {
    "view.test.jsx": "const view = <section>require('node:test')</section>; test('Jest JSX', () => {});",
    "old.test.tsx": "const view = <section>require('node:test')</section>; test('Jest TSX', () => {});",
    "browser.spec.js": "import test from 'node:test'; test('browser only', () => {});",
    "browser.spec.ts": "test('browser only', () => {});",
  };
  expect(plan(sources).jestFiles).toEqual(["old.test.tsx", "view.test.jsx"]);
  expect(plan(sources).nodeFiles).toEqual([]);
});

test("CommonJS Jest imports preserve mixed-framework rejection and comments cannot divert JS suites", () => {
  expect(() => plan({ "mixed.test.cjs": "const test = require('node:test'); const { expect } = require('@jest/globals');" }))
    .toThrow("MIXED_TEST_FRAMEWORKS");
  expect(plan({ "jest.test.js": "// require('node:test');\nconst note = 'node:test'; test('actual Jest', () => {});" }).jestFiles)
    .toEqual(["jest.test.js"]);
  expect(plan({ "effect.contract.js": "import './register-suite';" }).jestFiles).toEqual(["effect.contract.js"]);
});
test("the explicit durable production contract uses its reviewed source role while its real suite remains Jest", () => {
  const file = "src/lib/platform/estimateRevisionDurableStore.contract.ts";
  const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
  const suite = "tests/aiEstimateV4/estimateRevisionDurableStore.contract.test.ts";
  for (const body of [source.replace(/\r\n/g, "\n"), source.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")]) {
    expect(plan({ [file]: body, [suite]: "test('real durable adapter contract', () => {});" })).toEqual({
      jestFiles: [suite], nodeFiles: [], nonTestContractFiles: [file], removedTestFiles: [],
    });
  }
});

test("a production role cannot hide changed source or exempt another executable contract path", () => {
  const file = "src/lib/platform/estimateRevisionDurableStore.contract.ts";
  const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
  for (const addition of ["\ntest('unexpected suite', () => {});", "\nimport './register-suite';", "\nconst changed = 1;"]) {
    expect(() => plan({ [file]: source + addition })).toThrow(`PRODUCTION_CONTRACT_ROLE_SOURCE_DRIFT:${file}`);
  }
  const other = "other/runtime.contract.ts";
  expect(plan({ [other]: source }).jestFiles).toEqual([other]);
});
