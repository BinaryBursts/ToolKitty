/**
 * Result formatting shared by ToolKitty's converters (REQ-5).
 *
 * The rule the requirement states, and the only rule this module implements:
 *
 * - exactly zero shows as `0.00`;
 * - an absolute value of 0.01 or more shows to exactly two decimal places;
 * - an absolute value greater than zero but below 0.01 shows to four
 *   significant figures instead, so a small result never rounds away to
 *   `0.00` (1 mg in kg reads `0.000001000`).
 *
 * Results are always rendered in plain decimal notation — never `1.000e-7` —
 * because a visitor reading a converted weight should not have to read an
 * exponent.
 */

/** Matches a JavaScript exponential literal, e.g. `-1.234e-7` or `1e+21`. */
const EXPONENTIAL = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i;

/**
 * Rewrite an exponential string produced by `toFixed`/`toPrecision` as plain
 * decimal digits, keeping every digit it was given (so the trailing zeros that
 * carry significance survive). A string that is already plain comes back
 * unchanged.
 */
function toPlainDecimal(text: string): string {
  const match = EXPONENTIAL.exec(text);
  if (match === null) {
    return text;
  }

  const sign = match[1] ?? "";
  const integerDigits = match[2] ?? "";
  const fractionDigits = match[3] ?? "";
  const exponent = Number(match[4]);
  const digits = `${integerDigits}${fractionDigits}`;
  // Where the decimal point lands once the exponent is applied.
  const pointIndex = integerDigits.length + exponent;

  if (pointIndex <= 0) {
    return `${sign}0.${"0".repeat(-pointIndex)}${digits}`;
  }
  if (pointIndex >= digits.length) {
    return `${sign}${digits}${"0".repeat(pointIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

/**
 * Format a converted value for display.
 *
 * @param value a finite number — the converters never produce anything else,
 *   because every non-finite input is rejected before conversion.
 * @throws RangeError if given `NaN` or an infinity. Showing a placeholder
 *   would mean showing a wrong answer, which the requirement rules out: a
 *   caller must handle its error case before it formats.
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `formatResult expects a finite number, received ${String(value)}`,
    );
  }

  // `=== 0` covers -0 as well, which the requirement also shows as 0.00.
  if (value === 0) {
    return "0.00";
  }

  if (Math.abs(value) >= 0.01) {
    const fixed = toPlainDecimal(value.toFixed(2));
    // `toFixed` gives up and returns exponential notation at 1e21 and above;
    // once expanded, such a value has no decimal part left to show.
    return fixed.includes(".") ? fixed : `${fixed}.00`;
  }

  return toPlainDecimal(value.toPrecision(4));
}
