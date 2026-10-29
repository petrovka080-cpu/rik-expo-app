const { quote, parse } = require("shell-quote");
const semver = require("semver");

describe("locked shell-quote command argument boundary", () => {
  it("uses the compatible fixed release for GHSA-pqg4-j6r4-53mv", () => {
    expect(semver.satisfies(require("shell-quote/package.json").version, ">=1.11.0 <2")).toBe(true);
  });
  it.each([["LF", "\n"], ["CR", "\r"], ["LS", "\u2028"], ["PS", "\u2029"]])("rejects %s after a comment token", (_name, separator) => {
    // Pure string processing only; never pass the quoted output to a shell.
    expect(() => quote(["echo", "ok", { comment: "fixture" }, `a${separator}GOX_NOT_EXECUTED;#`])).toThrow(TypeError);
  });
  it.each([
    ["ordinary CLI", ["open", "--app", "Example App", "http://127.0.0.1:8081/debugger-frontend/"]],
    ["Unicode and spaces", ["пример файла", "résumé", "plain"]],
    ["literal shell metacharacters", ["$HOME", "x; y", "a`b", "pipe|value"]],
    ["quotes and exclamation", ["single'quote", 'double"quote', "can't!"]],
    ["empty arguments", ["", "two", ""]],
    ["URL fragment", ["http://127.0.0.1:8081/#fragment", "?text=hello world"]],
    ["Windows paths", ["C:\\Program Files\\GOX\\file.js", "C:\\dev\\app"]],
  ])("preserves %s arguments", (_name, tokens) => {
    expect(parse(quote(tokens))).toEqual(tokens);
  });
});
