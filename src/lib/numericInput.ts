/**
 * Parsing of the number a visitor types, shared by every converter (REQ-5,
 * REQ-6) so that each screen rejects the same inputs with the same wording.
 *
 * An empty field is not an error — a visitor who has not typed anything yet,
 * or who has just cleared the field, should see no result and no complaint.
 * The parser reports that as its own outcome and leaves the screen to decide.
 *
 * A leading minus is parsed, not rejected: whether a negative value is
 * meaningful is the tool's business (a negative weight is not, a negative
 * temperature is), so the caller decides.
 */

/**
 * A plain decimal number: an optional sign, then digits with an optional
 * fractional part, or a bare fractional part. Exponent notation ("1e5"),
 * thousands separators, currency symbols, units and words are all rejected —
 * a converter field takes a number as a person writes one.
 */
const PLAIN_DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** What `parseNumericInput` found in the field. */
export type NumericInput =
  /** Nothing typed yet (or only whitespace): show no result, show no error. */
  | { kind: "empty" }
  /** A finite decimal number, sign included. */
  | { kind: "number"; value: number }
  /** Something that is not a number: show the message below. */
  | { kind: "invalid" };

/**
 * The inline message every converter shows when a visitor types something that
 * is not a number. Exported so the screens share one wording.
 */
export const NOT_A_NUMBER_MESSAGE = "Enter a number.";

/**
 * Read the contents of a converter's value field.
 *
 * Surrounding whitespace is ignored. An empty or whitespace-only string is
 * reported as `empty`, never as an error. Anything that is not a finite plain
 * decimal number is reported as `invalid`; the field is left as the visitor
 * typed it, so nothing they wrote is silently discarded.
 */
export function parseNumericInput(text: string): NumericInput {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { kind: "empty" };
  }

  if (!PLAIN_DECIMAL.test(trimmed)) {
    return { kind: "invalid" };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    // A long enough run of digits overflows to Infinity; a value that cannot
    // be represented must never reach the conversion maths.
    return { kind: "invalid" };
  }

  return { kind: "number", value };
}
