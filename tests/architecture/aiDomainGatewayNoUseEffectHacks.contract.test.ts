import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no useEffect hacks", () => {
  it("does not use useEffect or screen lifecycle fetches", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toMatch(/\buseEffect\s*\(/);
    expect(source).not.toMatch(/fetch\s*\(/);
  });
});
