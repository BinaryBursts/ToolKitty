import { describe, expect, it } from "vitest";

import { NOT_A_NUMBER_MESSAGE } from "./numericInput";
import {
  ABSOLUTE_ZERO,
  convertTemperature,
  formatTemperature,
  fromCelsius,
  isBelowAbsoluteZero,
  parseTemperatureInput,
  TEMPERATURE_MESSAGES,
  TEMPERATURE_SCALES,
  temperatureMessage,
  toCelsius,
  type TemperatureScale,
} from "./temperature";

/** The converted temperature as a visitor would read it. */
function shown(
  value: number,
  from: TemperatureScale,
  to: TemperatureScale,
): string {
  return formatTemperature(convertTemperature(value, from, to));
}

const SCALES: readonly TemperatureScale[] = ["celsius", "fahrenheit", "kelvin"];

describe("TEMPERATURE_SCALES", () => {
  it("holds exactly the three scales REQ-6 names, in display order", () => {
    expect(TEMPERATURE_SCALES.map((scale) => scale.id)).toEqual([
      "celsius",
      "fahrenheit",
      "kelvin",
    ]);
  });

  it("labels each scale with its name and symbol", () => {
    expect(
      TEMPERATURE_SCALES.map((scale) => [scale.label, scale.symbol]),
    ).toEqual([
      ["Celsius", "°C"],
      ["Fahrenheit", "°F"],
      ["Kelvin", "K"],
    ]);
  });
});

describe("convertTemperature", () => {
  // The values REQ-6 names in its acceptance criteria.
  it.each([
    { value: 0, from: "celsius", to: "fahrenheit", expected: "32.00" },
    { value: 100, from: "celsius", to: "fahrenheit", expected: "212.00" },
    { value: -40, from: "celsius", to: "fahrenheit", expected: "-40.00" },
    { value: 0, from: "celsius", to: "kelvin", expected: "273.15" },
    { value: 0, from: "kelvin", to: "celsius", expected: "-273.15" },
    { value: 98.6, from: "fahrenheit", to: "celsius", expected: "37.00" },
  ] as const)(
    "shows $value $from in $to as $expected",
    ({ value, from, to, expected }) => {
      expect(shown(value, from, to)).toBe(expected);
    },
  );

  // The rest of the pairings, so every route through Celsius is exercised.
  it.each([
    { value: 37, from: "celsius", to: "fahrenheit", expected: "98.60" },
    { value: 212, from: "fahrenheit", to: "celsius", expected: "100.00" },
    { value: -40, from: "fahrenheit", to: "celsius", expected: "-40.00" },
    { value: 100, from: "celsius", to: "kelvin", expected: "373.15" },
    { value: 273.15, from: "kelvin", to: "celsius", expected: "0.00" },
    { value: 32, from: "fahrenheit", to: "kelvin", expected: "273.15" },
    { value: 300, from: "kelvin", to: "fahrenheit", expected: "80.33" },
    { value: 0, from: "kelvin", to: "fahrenheit", expected: "-459.67" },
    { value: -459.67, from: "fahrenheit", to: "kelvin", expected: "0.00" },
  ] as const)(
    "shows $value $from in $to as $expected",
    ({ value, from, to, expected }) => {
      expect(shown(value, from, to)).toBe(expected);
    },
  );

  it.each(SCALES)("returns the value unchanged from %s to itself", (scale) => {
    for (const value of [0, 36.6, -12.345, 1234.5678, ABSOLUTE_ZERO[scale]]) {
      expect(convertTemperature(value, scale, scale)).toBe(value);
      expect(shown(value, scale, scale)).toBe(formatTemperature(value));
    }
  });

  it.each([0, 36.6, -273.15])(
    "round trips %p through Fahrenheit and back",
    (value) => {
      const back = convertTemperature(
        convertTemperature(value, "celsius", "fahrenheit"),
        "fahrenheit",
        "celsius",
      );
      expect(back).toBeCloseTo(value, 10);
      expect(formatTemperature(back)).toBe(formatTemperature(value));
    },
  );

  it.each([0, 36.6, -273.15])(
    "round trips %p through Kelvin and back",
    (value) => {
      const back = convertTemperature(
        convertTemperature(value, "celsius", "kelvin"),
        "kelvin",
        "celsius",
      );
      expect(back).toBeCloseTo(value, 10);
      expect(formatTemperature(back)).toBe(formatTemperature(value));
    },
  );

  it("converts negative temperatures normally, unlike weight", () => {
    expect(shown(-17.78, "celsius", "fahrenheit")).toBe("0.00");
    expect(shown(-273.15, "celsius", "kelvin")).toBe("0.00");
    expect(shown(-100, "celsius", "fahrenheit")).toBe("-148.00");
  });

  it("refuses a scale that is not one of the three", () => {
    const bogus = "rankine" as TemperatureScale;
    expect(() => convertTemperature(0, bogus, "celsius")).toThrow(RangeError);
    expect(() => convertTemperature(0, "celsius", bogus)).toThrow(RangeError);
    expect(() => convertTemperature(0, bogus, bogus)).toThrow(RangeError);
  });
});

describe("toCelsius / fromCelsius", () => {
  it("uses the exact definitions REQ-6 gives", () => {
    expect(fromCelsius(0, "fahrenheit")).toBe(32);
    expect(fromCelsius(100, "fahrenheit")).toBe(212);
    expect(fromCelsius(0, "kelvin")).toBe(273.15);
    expect(toCelsius(32, "fahrenheit")).toBe(0);
    expect(toCelsius(0, "kelvin")).toBe(-273.15);
    expect(toCelsius(12.5, "celsius")).toBe(12.5);
    expect(fromCelsius(12.5, "celsius")).toBe(12.5);
  });
});

describe("ABSOLUTE_ZERO / isBelowAbsoluteZero", () => {
  it("is the same temperature in all three scales", () => {
    expect(ABSOLUTE_ZERO).toEqual({
      celsius: -273.15,
      fahrenheit: -459.67,
      kelvin: 0,
    });
    expect(formatTemperature(convertTemperature(0, "kelvin", "celsius"))).toBe(
      "-273.15",
    );
    expect(
      formatTemperature(convertTemperature(0, "kelvin", "fahrenheit")),
    ).toBe("-459.67");
  });

  it.each(SCALES)("treats absolute zero itself as valid on %s", (scale) => {
    expect(isBelowAbsoluteZero(ABSOLUTE_ZERO[scale], scale)).toBe(false);
    expect(isBelowAbsoluteZero(ABSOLUTE_ZERO[scale] + 0.01, scale)).toBe(false);
    expect(isBelowAbsoluteZero(ABSOLUTE_ZERO[scale] - 0.01, scale)).toBe(true);
  });

  it("judges a value against the scale it was typed in", () => {
    // -300 is impossible in Celsius, ordinary in Kelvin.
    expect(isBelowAbsoluteZero(-300, "celsius")).toBe(true);
    expect(isBelowAbsoluteZero(-300, "fahrenheit")).toBe(false);
    expect(isBelowAbsoluteZero(300, "kelvin")).toBe(false);
    expect(isBelowAbsoluteZero(-0.0001, "kelvin")).toBe(true);
  });
});

describe("parseTemperatureInput", () => {
  it.each(["", "   ", "\t\n"])(
    "reports %p as an empty field, not an error",
    (raw) => {
      expect(parseTemperatureInput(raw, "celsius")).toEqual({
        status: "empty",
      });
    },
  );

  it.each(["abc", "-", ".", "12abc", "1,000", "--1", "1.2.3", "1e3", "NaN"])(
    "reports %p as not a number",
    (raw) => {
      expect(parseTemperatureInput(raw, "celsius")).toEqual({
        status: "not-a-number",
      });
    },
  );

  it.each([
    { raw: "0", value: 0 },
    { raw: " 36.6 ", value: 36.6 },
    { raw: "-40", value: -40 },
    { raw: "98.6", value: 98.6 },
    { raw: "-0.5", value: -0.5 },
    { raw: ".5", value: 0.5 },
  ])("reads $raw as $value", ({ raw, value }) => {
    expect(parseTemperatureInput(raw, "celsius")).toEqual({
      status: "ok",
      value,
    });
  });

  it.each([
    { raw: "-300", scale: "celsius", limit: -273.15 },
    { raw: "-460", scale: "fahrenheit", limit: -459.67 },
    { raw: "-1", scale: "kelvin", limit: 0 },
    { raw: "-273.16", scale: "celsius", limit: -273.15 },
    { raw: "-459.68", scale: "fahrenheit", limit: -459.67 },
    { raw: "-0.01", scale: "kelvin", limit: 0 },
  ] as const)(
    "refuses $raw on $scale as below absolute zero",
    ({ raw, scale, limit }) => {
      expect(parseTemperatureInput(raw, scale)).toEqual({
        status: "below-absolute-zero",
        limit,
      });
    },
  );

  it.each([
    { raw: "-273.15", scale: "celsius", value: -273.15 },
    { raw: "-459.67", scale: "fahrenheit", value: -459.67 },
    { raw: "0", scale: "kelvin", value: 0 },
  ] as const)(
    "accepts absolute zero itself: $raw on $scale",
    ({ raw, scale, value }) => {
      expect(parseTemperatureInput(raw, scale)).toEqual({
        status: "ok",
        value,
      });
    },
  );

  it("reads a value that is impossible in one scale and fine in another", () => {
    expect(parseTemperatureInput("-300", "celsius").status).toBe(
      "below-absolute-zero",
    );
    expect(parseTemperatureInput("-300", "fahrenheit")).toEqual({
      status: "ok",
      value: -300,
    });
  });
});

describe("temperature messages", () => {
  it("shares the not-a-number wording with the other converters", () => {
    expect(TEMPERATURE_MESSAGES["not-a-number"]).toBe(NOT_A_NUMBER_MESSAGE);
    expect(temperatureMessage("not-a-number")).toBe("Enter a number.");
  });

  it("names absolute zero in all three scales", () => {
    expect(temperatureMessage("below-absolute-zero")).toBe(
      "That is below absolute zero (-273.15 °C / -459.67 °F / 0 K).",
    );
  });
});

describe("formatTemperature", () => {
  it.each([
    { value: 32, expected: "32.00" },
    { value: -40, expected: "-40.00" },
    { value: 0, expected: "0.00" },
    { value: 273.15, expected: "273.15" },
    { value: -273.15, expected: "-273.15" },
    { value: 36.6, expected: "36.60" },
    { value: 1234.5678, expected: "1234.57" },
    { value: -1234.5678, expected: "-1234.57" },
  ])("formats $value as $expected", ({ value, expected }) => {
    expect(formatTemperature(value)).toBe(expected);
  });

  it("always shows exactly two decimal places", () => {
    for (const value of [0, 1, -1, 0.5, -0.5, 1e-6, -1e-6, 1e9, -273.15]) {
      expect(formatTemperature(value)).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("keeps the small-value rule of the weight converter out of the way", () => {
    // formatResult would show these as four significant figures; a temperature
    // that small is just zero to two places.
    expect(formatTemperature(0.004)).toBe("0.00");
    expect(formatTemperature(1e-6)).toBe("0.00");
  });

  it("never shows a signed zero", () => {
    expect(formatTemperature(-0)).toBe("0.00");
    expect(formatTemperature(-0.001)).toBe("0.00");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "refuses to format %p rather than print a wrong answer",
    (value) => {
      expect(() => formatTemperature(value)).toThrow(RangeError);
    },
  );
});
