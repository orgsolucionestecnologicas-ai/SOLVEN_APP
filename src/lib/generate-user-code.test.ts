import { describe, expect, it } from "vitest";
import { generateUserCode } from "./generate-user-code";

describe("generateUserCode", () => {
  it("generates a code with first 2 letters + 4 digits", () => {
    const code = generateUserCode("Diego");
    expect(code).toMatch(/^DI\d{4}$/);
  });

  it("handles accented characters", () => {
    const code = generateUserCode("María");
    expect(code).toMatch(/^MA\d{4}$/);
  });

  it("handles short names by padding with X", () => {
    const code = generateUserCode("A");
    expect(code).toMatch(/^AX\d{4}$/);
  });

  it("handles empty names with XX prefix", () => {
    const code = generateUserCode("");
    expect(code).toMatch(/^XX\d{4}$/);
  });

  it("generates 4-digit numbers between 1000 and 9999", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateUserCode("Test");
      const num = parseInt(code.slice(2), 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });
});
