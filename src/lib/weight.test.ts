import { describe, expect, it } from "vitest";

import { formatResult } from "./formatResult";
import { NOT_A_NUMBER_MESSAGE } from "./numericInput";
import {
  convertWeight,
  DEFAULT_FROM_UNIT,
  DEFAULT_TO_UNIT,
  findWeightUnit,
  MAX_GRAMS,
  WEIGHT_CONVERSION_MESSAGES,
  WEIGHT_UNITS,
  weightConversionMessage,
  type WeightUnitId,
} from "./weight";

/** The converted number, or a failure the test did not expect. */
function convertedValue(
  value: number | string,
  from: WeightUnitId,
  to: WeightUnitId,
): number {
  const result = convertWeight(value, from, to);
  if (!result.ok) {
    throw new Error(
      `expected ${String(value)} ${from} to ${to} to convert, got ${result.reason}`,
    );
  }
  return result.value;
}

/** The converted number as a visitor would read it. */
function shown(
  value: number | string,
  from: WeightUnitId,
  to: WeightUnitId,
): string {
  return formatResult(convertedValue(value, from, to));
}

describe("WEIGHT_UNITS", () => {
  it("holds exactly the nine units REQ-5 names, in display order", () => {
    expect(WEIGHT_UNITS.map((unit) => unit.id)).toEqual([
      "milligram",
      "gram",
      "kilogram",
      "tonne",
      "ounce",
      "pound",
      "stone",
      "us-ton",
      "troy-ounce",
    ]);
    expect(WEIGHT_UNITS).toHaveLength(9);
  });

  // The literal constants from REQ-5. A typo in the table fails the build.
  it.each([
    { id: "milligram", gramsPerUnit: 0.001 },
    { id: "gram", gramsPerUnit: 1 },
    { id: "kilogram", gramsPerUnit: 1000 },
    { id: "tonne", gramsPerUnit: 1000000 },
    { id: "ounce", gramsPerUnit: 28.349523125 },
    { id: "pound", gramsPerUnit: 453.59237 },
    { id: "stone", gramsPerUnit: 6350.29318 },
    { id: "us-ton", gramsPerUnit: 907184.74 },
    { id: "troy-ounce", gramsPerUnit: 31.1034768 },
  ] as const)("defines $id as $gramsPerUnit g", ({ id, gramsPerUnit }) => {
    expect(findWeightUnit(id)?.gramsPerUnit).toBe(gramsPerUnit);
  });

  it("keeps the imperial units at their defined multiples of the pound", () => {
    const pound = findWeightUnit("pound")?.gramsPerUnit ?? 0;
    // 1 stone = 14 lb, 1 US ton = 2000 lb — true to within floating point,
    // which is why the table carries the requirement's literals instead.
    expect(findWeightUnit("stone")?.gramsPerUnit).toBeCloseTo(14 * pound, 6);
    expect(findWeightUnit("us-ton")?.gramsPerUnit).toBe(2000 * pound);
  });

  it("labels each unit with its full name and symbol", () => {
    expect(WEIGHT_UNITS.map((unit) => unit.label)).toEqual([
      "Milligram (mg)",
      "Gram (g)",
      "Kilogram (kg)",
      "Tonne (t)",
      "Ounce (oz)",
      "Pound (lb)",
      "Stone (st)",
      "US ton (ton)",
      "Troy ounce (ozt)",
    ]);
  });

  it("distinguishes the ounce from the troy ounce", () => {
    const ounce = findWeightUnit("ounce");
    const troyOunce = findWeightUnit("troy-ounce");

    expect(ounce?.label).toBe("Ounce (oz)");
    expect(troyOunce?.label).toBe("Troy ounce (ozt)");
    expect(ounce?.label).not.toBe(troyOunce?.label);
    expect(ounce?.gramsPerUnit).not.toBe(troyOunce?.gramsPerUnit);
  });

  it("gives every unit a distinct id, label and symbol", () => {
    expect(new Set(WEIGHT_UNITS.map((unit) => unit.id)).size).toBe(9);
    expect(new Set(WEIGHT_UNITS.map((unit) => unit.label)).size).toBe(9);
    expect(new Set(WEIGHT_UNITS.map((unit) => unit.symbol)).size).toBe(9);
  });

  it("starts the visitor on kilogram to pound", () => {
    expect(DEFAULT_FROM_UNIT).toBe("kilogram");
    expect(DEFAULT_TO_UNIT).toBe("pound");
  });

  it("finds nothing for an id that is not one of the nine", () => {
    expect(findWeightUnit("carat")).toBeUndefined();
  });
});

describe("convertWeight", () => {
  // Every example REQ-5's acceptance criteria give, read as a visitor sees it.
  it.each([
    { value: 1, from: "kilogram", to: "pound", shows: "2.20" },
    { value: 1, from: "milligram", to: "kilogram", shows: "0.000001000" },
    { value: 1, from: "troy-ounce", to: "gram", shows: "31.10" },
    { value: 1, from: "ounce", to: "gram", shows: "28.35" },
    { value: 14, from: "pound", to: "stone", shows: "1.00" },
    // After the swap control: pound to kilogram.
    { value: 1, from: "pound", to: "kilogram", shows: "0.45" },
    // A few more that hold the table honest.
    { value: 1, from: "tonne", to: "kilogram", shows: "1000.00" },
    { value: 1, from: "us-ton", to: "pound", shows: "2000.00" },
    { value: 1, from: "stone", to: "pound", shows: "14.00" },
    { value: 1, from: "gram", to: "milligram", shows: "1000.00" },
    { value: 0, from: "kilogram", to: "pound", shows: "0.00" },
  ] as const)(
    "$value $from in $to shows $shows",
    ({ value, from, to, shows }) => {
      expect(shown(value, from, to)).toBe(shows);
    },
  );

  it("reads the value from the text of the field as well as a number", () => {
    expect(shown(" 1 ", "kilogram", "pound")).toBe("2.20");
    expect(shown("14", "pound", "stone")).toBe("1.00");
  });

  it.each(WEIGHT_UNITS.map((unit) => unit.id))(
    "returns the value unchanged when %s converts to itself",
    (id) => {
      for (const value of [0, 1, 0.1, 2.5, 1234.5678]) {
        expect(convertedValue(value, id, id)).toBe(value);
      }
      expect(shown(2.2046226218, id, id)).toBe("2.20");
      expect(shown(1e-6, id, id)).toBe("0.000001000");
      expect(shown(0, id, id)).toBe("0.00");
    },
  );

  describe("failures", () => {
    it.each([-5, -0.001, -1e9])("rejects %p as negative", (value) => {
      expect(convertWeight(value, "kilogram", "pound")).toEqual({
        ok: false,
        reason: "negative",
      });
    });

    it("rejects a negative typed into the field", () => {
      expect(convertWeight("-5", "kilogram", "pound")).toEqual({
        ok: false,
        reason: "negative",
      });
    });

    it.each(["abc", "", "   ", "12kg", "1,000", "1e5", "NaN"])(
      "rejects %p as not a number",
      (text) => {
        expect(convertWeight(text, "kilogram", "pound")).toEqual({
          ok: false,
          reason: "not-a-number",
        });
      },
    );

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      "rejects %p as not a number",
      (value) => {
        expect(convertWeight(value, "kilogram", "pound")).toEqual({
          ok: false,
          reason: "not-a-number",
        });
      },
    );

    it("converts at the top of the range and refuses just above it", () => {
      expect(convertedValue(MAX_GRAMS, "gram", "gram")).toBe(MAX_GRAMS);
      expect(convertedValue(1e12, "kilogram", "tonne")).toBe(1e9);

      expect(convertWeight(MAX_GRAMS + 1e3, "gram", "kilogram")).toEqual({
        ok: false,
        reason: "out-of-range",
      });
      expect(convertWeight(1e13, "kilogram", "tonne")).toEqual({
        ok: false,
        reason: "out-of-range",
      });
      expect(convertWeight("1e15", "tonne", "gram")).toEqual({
        ok: false,
        // Exponent notation is not a number a visitor may type.
        reason: "not-a-number",
      });
    });

    it("converts the smallest and largest weights inside the range", () => {
      expect(shown(0.001, "milligram", "milligram")).toBe("0.001000");
      expect(shown(MAX_GRAMS, "gram", "tonne")).toBe("1000000000.00");
    });

    it("throws for a unit id that is not one of the nine", () => {
      expect(() => convertWeight(1, "carat" as WeightUnitId, "gram")).toThrow(
        RangeError,
      );
      expect(() => convertWeight(1, "gram", "carat" as WeightUnitId)).toThrow(
        RangeError,
      );
    });
  });

  describe("round trips", () => {
    const values = [1, 0.5, 1234.5678, 0.001, 987654.321];

    // All 81 ordered pairs of the nine units, each way and back.
    for (const from of WEIGHT_UNITS) {
      for (const to of WEIGHT_UNITS) {
        it(`returns to the original value through ${from.id} → ${to.id} → ${from.id}`, () => {
          for (const value of values) {
            const there = convertedValue(value, from.id, to.id);
            const back = convertedValue(there, to.id, from.id);
            expect(Math.abs(back - value) / value).toBeLessThan(1e-9);
          }
        });
      }
    }

    it("covers every ordered pair", () => {
      expect(WEIGHT_UNITS.length * WEIGHT_UNITS.length).toBe(81);
    });
  });
});

describe("WEIGHT_CONVERSION_MESSAGES", () => {
  it("gives one wording for each reason a conversion can fail", () => {
    expect(Object.keys(WEIGHT_CONVERSION_MESSAGES).sort()).toEqual([
      "negative",
      "not-a-number",
      "out-of-range",
    ]);
    for (const message of Object.values(WEIGHT_CONVERSION_MESSAGES)) {
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("shares the not-a-number wording with the other converters", () => {
    expect(weightConversionMessage("not-a-number")).toBe(NOT_A_NUMBER_MESSAGE);
  });

  it("says a negative weight is not meaningful and that a big one is out of range", () => {
    expect(weightConversionMessage("negative")).toMatch(/negative weight/i);
    expect(weightConversionMessage("out-of-range")).toMatch(/out of range/i);
  });
});
