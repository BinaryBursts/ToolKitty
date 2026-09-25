/**
 * Temperature conversion (REQ-6): the three scales, the exact definitions, and
 * the reading of what a visitor types.
 *
 * Every conversion goes through Celsius, so the module holds two definitions
 * rather than a table of nine pairings:
 *
 * - °F = °C × 9/5 + 32, and its inverse;
 * - K = °C + 273.15, and its inverse.
 *
 * Unlike weight, a negative value is perfectly meaningful here; what is not
 * meaningful is a value below absolute zero, which the parser reports so the
 * screen can refuse it.
 *
 * Nothing here touches the DOM, the network or any storage API: every function
 * is a function of its arguments alone, and the maths is proved by its own
 * tests so a screen only has to show what these functions return.
 */

import { formatFixed2 } from "./formatResult";
import { NOT_A_NUMBER_MESSAGE, parseNumericInput } from "./numericInput";

/** Stable identifier of a temperature scale; also its value in the pickers. */
export type TemperatureScale = "celsius" | "fahrenheit" | "kelvin";

export interface TemperatureScaleInfo {
  /** Stable identifier, used in state and in the scale pickers. */
  readonly id: TemperatureScale;
  /** Full name, e.g. "Celsius". */
  readonly label: string;
  /** Symbol, e.g. "°C" — what a segment of the picker is written with. */
  readonly symbol: string;
}

/**
 * The three scales, in the order the pickers show them: the two everyday
 * scales first, in the order the default pair uses them, then Kelvin.
 */
export const TEMPERATURE_SCALES: readonly TemperatureScaleInfo[] = [
  { id: "celsius", label: "Celsius", symbol: "°C" },
  { id: "fahrenheit", label: "Fahrenheit", symbol: "°F" },
  { id: "kelvin", label: "Kelvin", symbol: "K" },
] as const;

/**
 * Absolute zero in each scale — the lowest value that means anything, and a
 * valid value itself: exactly -273.15 °C converts, -273.16 °C does not.
 */
export const ABSOLUTE_ZERO: Readonly<Record<TemperatureScale, number>> = {
  celsius: -273.15,
  fahrenheit: -459.67,
  kelvin: 0,
};

/** Is this value colder than anything can be, on the scale it was typed in? */
export function isBelowAbsoluteZero(
  value: number,
  scale: TemperatureScale,
): boolean {
  return value < ABSOLUTE_ZERO[scale];
}

/**
 * The value in Celsius, whatever scale it was given in.
 *
 * @throws RangeError if the scale is not one of the three — a programming
 *   error, since the pickers can only offer {@link TEMPERATURE_SCALES}.
 */
export function toCelsius(value: number, from: TemperatureScale): number {
  switch (from) {
    case "celsius":
      return value;
    case "fahrenheit":
      return ((value - 32) * 5) / 9;
    case "kelvin":
      return value - 273.15;
    default:
      throw new RangeError(`Unknown temperature scale: ${String(from)}`);
  }
}

/**
 * A Celsius value read back in another scale.
 *
 * @throws RangeError if the scale is not one of the three.
 */
export function fromCelsius(celsius: number, to: TemperatureScale): number {
  switch (to) {
    case "celsius":
      return celsius;
    case "fahrenheit":
      return (celsius * 9) / 5 + 32;
    case "kelvin":
      return celsius + 273.15;
    default:
      throw new RangeError(`Unknown temperature scale: ${String(to)}`);
  }
}

/**
 * Convert a temperature from one scale to another, through Celsius.
 *
 * With the same scale on both sides the value comes back untouched rather than
 * through a round trip: 36.6 °F → °C → °F need not land back on 36.6 in binary
 * floating point, and REQ-6 says the result equals the input.
 *
 * The value is assumed to have been read by {@link parseTemperatureInput}
 * first: this function converts, it does not judge.
 */
export function convertTemperature(
  value: number,
  from: TemperatureScale,
  to: TemperatureScale,
): number {
  if (from === to) {
    // Still check the scale, so a bad id is a mistake here and not on the
    // screen two conversions later.
    toCelsius(value, from);
    return value;
  }

  return fromCelsius(toCelsius(value, from), to);
}

/** What {@link parseTemperatureInput} found in the value field. */
export type TemperatureInput =
  /** Nothing typed yet (or only whitespace): show no result, show no error. */
  | { readonly status: "empty" }
  /** Something that is not a number: show {@link NOT_A_NUMBER_MESSAGE}. */
  | { readonly status: "not-a-number" }
  /**
   * A number, but colder than absolute zero on the from-scale. `limit` is
   * absolute zero in that scale, for a caller that wants to name it.
   */
  | { readonly status: "below-absolute-zero"; readonly limit: number }
  /** A temperature that can be converted. */
  | { readonly status: "ok"; readonly value: number };

/**
 * The inline message for each refusal. The not-a-number wording is the one
 * every converter shares, so the weight and temperature screens complain about
 * the same thing in the same words.
 */
export const TEMPERATURE_MESSAGES: Readonly<
  Record<"not-a-number" | "below-absolute-zero", string>
> = {
  "not-a-number": NOT_A_NUMBER_MESSAGE,
  "below-absolute-zero":
    "That is below absolute zero (-273.15 °C / -459.67 °F / 0 K).",
};

/** The message to show inline when a value cannot be converted. */
export function temperatureMessage(
  status: "not-a-number" | "below-absolute-zero",
): string {
  return TEMPERATURE_MESSAGES[status];
}

/**
 * Read the contents of the temperature field, in the scale it was typed in.
 *
 * Surrounding whitespace is ignored; an empty field is not an error. A plain
 * decimal number is expected — a leading sign, digits and at most one decimal
 * point. Exponent notation ("1e3") is rejected along with letters, a lone `-`
 * and a lone `.`: a temperature is written the way a person writes one.
 */
export function parseTemperatureInput(
  raw: string,
  from: TemperatureScale,
): TemperatureInput {
  const parsed = parseNumericInput(raw);

  if (parsed.kind === "empty") {
    return { status: "empty" };
  }

  if (parsed.kind === "invalid") {
    return { status: "not-a-number" };
  }

  if (isBelowAbsoluteZero(parsed.value, from)) {
    return { status: "below-absolute-zero", limit: ABSOLUTE_ZERO[from] };
  }

  return { status: "ok", value: parsed.value };
}

/**
 * A temperature as a visitor reads it: exactly two decimal places, negatives
 * included (-40.00).
 *
 * Deliberately *not* {@link formatResult}: the weight converter's small-value
 * rule, which falls back to four significant figures below 0.01, has no place
 * here. A temperature near zero is an ordinary temperature — 0.004 °C reads
 * `0.00`, not `0.004000` — so this wraps the fixed two-decimal formatter of the
 * conversion core instead of adding a second formatter of its own.
 *
 * @throws RangeError if given `NaN` or an infinity; a caller shows its error
 *   message instead of formatting.
 */
export function formatTemperature(value: number): string {
  return formatFixed2(value);
}
