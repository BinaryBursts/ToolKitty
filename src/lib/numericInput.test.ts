import { describe, expect, it } from "vitest";

import { NOT_A_NUMBER_MESSAGE, parseNumericInput } from "./numericInput";

describe("parseNumericInput", () => {
  it.each(["", "   ", "\t\n"])(
    "treats %p as no input rather than an error",
    (text) => {
      expect(parseNumericInput(text)).toEqual({ kind: "empty" });
    },
  );

  it.each([
    { text: "1", value: 1 },
    { text: " 2.5 ", value: 2.5 },
    { text: "0", value: 0 },
    { text: "0.001", value: 0.001 },
    { text: ".5", value: 0.5 },
    { text: "5.", value: 5 },
    { text: "-5", value: -5 },
    { text: "-0.25", value: -0.25 },
    { text: "+3", value: 3 },
    { text: "007", value: 7 },
  ])("reads $text as $value", ({ text, value }) => {
    expect(parseNumericInput(text)).toEqual({ kind: "number", value });
  });

  it.each([
    "abc",
    "12kg",
    "1,000",
    "1 2",
    "--1",
    "1.2.3",
    ".",
    "-",
    "NaN",
    "Infinity",
    "1e5",
    "0x10",
    "1".repeat(400),
  ])("rejects %p as not a number", (text) => {
    expect(parseNumericInput(text)).toEqual({ kind: "invalid" });
  });

  it("keeps a leading minus so the caller decides whether it is allowed", () => {
    expect(parseNumericInput("-273.15")).toEqual({
      kind: "number",
      value: -273.15,
    });
  });

  it("exports one wording for the not-a-number message", () => {
    expect(NOT_A_NUMBER_MESSAGE).toBe("Enter a number.");
  });
});
