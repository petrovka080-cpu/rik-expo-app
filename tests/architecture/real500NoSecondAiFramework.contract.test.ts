import packageJson from "../../package.json";

test("real 500 wave does not introduce a second AI framework", () => {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  expect(Object.keys(dependencies).filter((name) => /langchain|llamaindex|semantic-kernel|haystack/i.test(name))).toEqual([]);
});
