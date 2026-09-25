import { describe, expect, it } from "vitest";

import { formatFixed2, formatResult } from "./formatResult";

describe("formatResult", () => {
  it.each([
    // The examples REQ-5 gives by name.
    { value: 2.2046226218, expected: "2.20", why: "1 kg in pounds" },
    { value: 1e-6, expected: "0.000001000", why: "1 mg in kilograms" },
    { value: 0, expected: "0.00", why: "exactly zero" },
    { value: 31.1034768, expected: "31.10", why: "1 troy ounce in grams" },
    { value: 28.349523125, expected: "28.35", why: "1 ounce in grams" },
    { value: 0.45359237, expected: "0.45", why: "1 pound in kilograms" },

    // The 0.01 boundary, either side of it.
    { value: 0.01, expected: "0.01", why: "exactly the boundary: two places" },
    {
      value: 0.0100001,
      expected: "0.01",
      why: "just above the boundary: two places",
    },
    {
      value: 0.009999,
      expected: "0.009999",
      why: "just below the boundary: four significant figures",
    },
    {
      value: 0.001,
      expected: "0.001000",
      why: "below the boundary, trailing zeros kept",
    },

    // Very small values, where toPrecision would reach for an exponent.
    { value: 1e-7, expected: "0.0000001000", why: "plain, never 1.000e-7" },
    { value: 1.2345e-9, expected: "0.000000001235", why: "rounds to four" },
    {
      value: Number.MIN_VALUE,
      expected: `0.${"0".repeat(323)}4941`,
      why: "denormal",
    },

    // Large values.
    { value: 1234567.891, expected: "1234567.89", why: "large value" },
    { value: 1e15, expected: "1000000000000000.00", why: "the range limit" },
    {
      value: 1e21,
      expected: "1000000000000000000000.00",
      why: "beyond toFixed",
    },

    // Rounding of the two-decimal case.
    { value: 2.005, expected: "2.00", why: "binary 2.005 is just below" },
    { value: 2.345, expected: "2.35", why: "rounds up" },

    // Negatives behave symmetrically.
    { value: -2.2046226218, expected: "-2.20", why: "negative, two places" },
    { value: -1e-6, expected: "-0.000001000", why: "negative, four figures" },
    { value: -1e-7, expected: "-0.0000001000", why: "negative, plain" },
    { value: -0, expected: "0.00", why: "negative zero is zero" },
  ])("formats $value as $expected ($why)", ({ value, expected }) => {
    expect(formatResult(value)).toBe(expected);
  });

  it("never shows a result as 0.00 unless it is exactly zero", () => {
    for (const value of [1e-6, 1e-12, -1e-6, 0.009, Number.MIN_VALUE]) {
      expect(formatResult(value)).not.toBe("0.00");
    }
  });

  it("always shows plain decimals, never exponential notation", () => {
    for (const value of [1e-7, 1e-20, -1e-15, 1e21, 1e30]) {
      expect(formatResult(value)).not.toMatch(/e/i);
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "refuses to format %p rather than print a wrong answer",
    (value) => {
      expect(() => formatResult(value)).toThrow(RangeError);
    },
  );
});

describe("formatFixed2", () => {
  it.each([
    { value: 0, expected: "0.00" },
    { value: -0, expected: "0.00" },
    { value: 32, expected: "32.00" },
    { value: -40, expected: "-40.00" },
    { value: 2.345, expected: "2.35" },
    { value: 1234567.891, expected: "1234567.89" },
    { value: 1e21, expected: "1000000000000000000000.00" },
  ])("formats $value as $expected", ({ value, expected }) => {
    expect(formatFixed2(value)).toBe(expected);
  });

  it("holds two decimal places where formatResult reaches for more", () => {
    expect(formatFixed2(0.009999)).toBe("0.01");
    expect(formatFixed2(1e-6)).toBe("0.00");
    expect(formatResult(1e-6)).toBe("0.000001000");
  });

  it("shows a value that rounds to zero from below as 0.00, not -0.00", () => {
    expect(formatFixed2(-1e-6)).toBe("0.00");
    expect(formatFixed2(-0.004)).toBe("0.00");
  });

  it("agrees with formatResult everywhere formatResult uses two places", () => {
    for (const value of [0.01, 2.2046226218, -2.2046226218, 1e15, 1e21]) {
      expect(formatFixed2(value)).toBe(formatResult(value));
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "refuses to format %p",
    (value) => {
      expect(() => formatFixed2(value)).toThrow(RangeError);
    },
  );
});
