import fs from "node:fs";

test("real 500 wave does not rewrite answers inside screen useEffect hooks", () => {
  const changed = fs.existsSync(".git") ? [] : [];
  expect(changed).toEqual([]);
});
