/**
 * Weight conversion (REQ-5): the nine units, their exact gram factors, and the
 * conversion itself.
 *
 * Every conversion goes through grams, which is what makes the factors exact
 * by definition rather than a table of 81 approximations. Nothing here touches
 * the DOM or React — the maths is proved by its own tests, and a screen only
 * has to show what these functions return.
 */

import { NOT_A_NUMBER_MESSAGE, parseNumericInput } from "./numericInput";

/** Stable identifier of a weight unit; also its value in the unit pickers. */
export type WeightUnitId =
  | "milligram"
  | "gram"
  | "kilogram"
  | "tonne"
  | "ounce"
  | "pound"
  | "stone"
  | "us-ton"
  | "troy-ounce";

export interface WeightUnit {
  /** Stable identifier, used in state and in the unit pickers. */
  readonly id: WeightUnitId;
  /** Full name, e.g. "Kilogram". */
  readonly name: string;
  /** Symbol, e.g. "kg". */
  readonly symbol: string;
  /**
   * Full name and symbol together, e.g. "Kilogram (kg)" — the label a picker
   * shows, so "Ounce (oz)" and "Troy ounce (ozt)" can never be confused.
   */
  readonly label: string;
  /** How many grams one of this unit is, exactly by definition. */
  readonly gramsPerUnit: number;
}

function unit(
  id: WeightUnitId,
  name: string,
  symbol: string,
  gramsPerUnit: number,
): WeightUnit {
  return { id, name, symbol, label: `${name} (${symbol})`, gramsPerUnit };
}

/**
 * The nine units, in the order the pickers show them: metric from small to
 * large, then imperial/US from small to large, then troy ounce last because it
 * is the specialist one.
 *
 * The gram factors are the exact definitions given in REQ-5 and are written as
 * literals on purpose. A stone is 14 pounds and a US ton 2000 pounds by
 * definition, but `14 * 453.59237` evaluates to 6350.293180000001 in binary
 * floating point, so deriving the factor would quietly disagree with the
 * requirement's constant.
 */
export const WEIGHT_UNITS: readonly WeightUnit[] = [
  unit("milligram", "Milligram", "mg", 0.001),
  unit("gram", "Gram", "g", 1),
  unit("kilogram", "Kilogram", "kg", 1000),
  unit("tonne", "Tonne", "t", 1_000_000),
  unit("ounce", "Ounce", "oz", 28.349523125),
  unit("pound", "Pound", "lb", 453.59237),
  unit("stone", "Stone", "st", 6350.29318),
  unit("us-ton", "US ton", "ton", 907_184.74),
  unit("troy-ounce", "Troy ounce", "ozt", 31.1034768),
] as const;

/** The unit pair a visitor starts on (REQ-5). */
export const DEFAULT_FROM_UNIT: WeightUnitId = "kilogram";
export const DEFAULT_TO_UNIT: WeightUnitId = "pound";

/**
 * The largest weight, in grams, that converts inside JavaScript's safe range.
 * Above this the answer would be wrong in digits a visitor can see, so the
 * conversion is refused instead (REQ-5).
 */
export const MAX_GRAMS = 1e15;

const UNITS_BY_ID = new Map<WeightUnitId, WeightUnit>(
  WEIGHT_UNITS.map((weightUnit) => [weightUnit.id, weightUnit]),
);

/** Look a unit up by id; `undefined` when the id is not one of the nine. */
export function findWeightUnit(id: string): WeightUnit | undefined {
  return UNITS_BY_ID.get(id as WeightUnitId);
}

/** Why a conversion could not be done. */
export type WeightConversionErrorReason =
  /** The value is not a number at all. */
  | "not-a-number"
  /** The value is below zero, and a negative weight is not meaningful. */
  | "negative"
  /** The value in grams is beyond the range that converts accurately. */
  | "out-of-range";

export type WeightConversionResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: WeightConversionErrorReason };

/**
 * The inline message for each failure, so the weight and temperature screens
 * word the same refusal the same way.
 */
export const WEIGHT_CONVERSION_MESSAGES: Readonly<
  Record<WeightConversionErrorReason, string>
> = {
  "not-a-number": NOT_A_NUMBER_MESSAGE,
  negative:
    "Enter a weight of zero or more — a negative weight is not meaningful.",
  "out-of-range": "That value is out of range — enter a weight below 1e15 g.",
};

/** The message to show inline for a failed conversion. */
export function weightConversionMessage(
  reason: WeightConversionErrorReason,
): string {
  return WEIGHT_CONVERSION_MESSAGES[reason];
}

/**
 * Convert a weight from one unit to another, through grams.
 *
 * `value` may be the number itself or the raw text of the field; text is read
 * with {@link parseNumericInput}. An empty field is *not* an input to a
 * conversion — a caller showing a live result should check for emptiness first
 * and show no result at all; passing one here reports `not-a-number`.
 *
 * Checks run in the order a visitor would expect to be told about them: is it
 * a number, is it a weight at all, is it a weight we can convert.
 *
 * @throws RangeError if either unit id is not one of the nine — a programming
 *   error, since the pickers can only offer {@link WEIGHT_UNITS}.
 */
export function convertWeight(
  value: number | string,
  fromId: WeightUnitId,
  toId: WeightUnitId,
): WeightConversionResult {
  const from = findWeightUnit(fromId);
  const to = findWeightUnit(toId);
  if (from === undefined || to === undefined) {
    throw new RangeError(
      `Unknown weight unit: ${from === undefined ? fromId : toId}`,
    );
  }

  let numeric: number;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, reason: "not-a-number" };
    }
    numeric = value;
  } else {
    const parsed = parseNumericInput(value);
    if (parsed.kind !== "number") {
      return { ok: false, reason: "not-a-number" };
    }
    numeric = parsed.value;
  }

  if (numeric < 0) {
    return { ok: false, reason: "negative" };
  }

  const grams = numeric * from.gramsPerUnit;
  if (!Number.isFinite(grams) || Math.abs(grams) > MAX_GRAMS) {
    return { ok: false, reason: "out-of-range" };
  }

  // Same unit both sides: dividing by the factor we just multiplied by would
  // lose a bit or two, and REQ-5 says the result equals the input.
  const converted = from.id === to.id ? numeric : grams / to.gramsPerUnit;

  if (!Number.isFinite(converted)) {
    return { ok: false, reason: "out-of-range" };
  }

  return { ok: true, value: converted };
}
