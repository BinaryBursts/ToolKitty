/**
 * JSON beautifying (REQ-8): the whole of the tool that is not a screen.
 *
 * `beautifyJson` takes the text a visitor pasted and the indent they chose and
 * gives back either the re-printed document or a failure the screen can show.
 * It is a function of its arguments and nothing else: parsing is the browser's
 * own `JSON.parse` — the input is never evaluated as code — no network call is
 * made, no storage API is touched, and nothing is kept once it returns. That
 * is the point of the tool: people paste API responses and config here, which
 * is exactly the data that must not leave the machine.
 *
 * Two things the requirement asks for need care:
 *
 * - Key order is preserved. `JSON.parse` keeps insertion order for string
 *   keys, `JSON.stringify` writes them back in that order, and nothing here
 *   sorts anything.
 * - The failure has to name a line and a column and quote the offending line.
 *   Browsers do not agree on how a `SyntaxError` reads, so the position is
 *   recovered from whichever shape the message happens to be in, and falls
 *   back to line 1, column 1 rather than guessing. The reason text itself is
 *   always the browser's own words.
 */

/** Stable identifier of an indent choice; also its value in the selector. */
export type IndentChoice = "two-spaces" | "four-spaces" | "tab";

export interface IndentOption {
  /** Stable identifier, used in page state and in the selector. */
  readonly id: IndentChoice;
  /** What the selector shows, e.g. "2 spaces". */
  readonly label: string;
}

/** The three indents REQ-8 names, in the order the selector shows them. */
export const INDENT_CHOICES: readonly IndentOption[] = [
  { id: "two-spaces", label: "2 spaces" },
  { id: "four-spaces", label: "4 spaces" },
  { id: "tab", label: "Tab" },
] as const;

/** The indent a visitor starts on (REQ-8). */
export const DEFAULT_INDENT: IndentChoice = "two-spaces";

/** What each choice means to `JSON.stringify`: a width, or the tab itself. */
const INDENT_VALUES: Readonly<Record<IndentChoice, number | string>> = {
  "two-spaces": 2,
  "four-spaces": 4,
  tab: "\t",
};

/**
 * The `space` argument `JSON.stringify` needs for a choice: `2`, `4`, or a
 * single tab character.
 */
export function indentValue(choice: IndentChoice): number | string {
  return INDENT_VALUES[choice];
}

/**
 * The largest input the tool will format: 1 MB, counted as UTF-8 bytes, so a
 * document of multi-byte characters is judged by its real size rather than by
 * its count of JavaScript code units (REQ-8).
 */
export const MAX_INPUT_BYTES = 1_048_576;

/**
 * How much of the offending line is quoted. A minified document is one very
 * long line, and quoting all of it would fill the screen; 200 characters is
 * enough to see where parsing stopped.
 */
export const LINE_TEXT_LIMIT = 200;

const ENCODER = new TextEncoder();

/** The size of `input` in UTF-8 bytes — what the 1 MB cap is measured in. */
export function inputByteLength(input: string): number {
  return ENCODER.encode(input).length;
}

/** Where parsing stopped, and the line it stopped on. */
export interface JsonErrorPosition {
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number within that line. */
  readonly column: number;
  /** The text of that line, truncated to {@link LINE_TEXT_LIMIT}. */
  readonly lineText: string;
}

/** What `beautifyJson` made of the input. */
export type JsonBeautifyResult =
  /** Nothing pasted yet, or only whitespace: not an error (REQ-8). */
  | { readonly status: "empty" }
  /** Above the 1 MB cap; refused before any parsing was attempted. */
  | { readonly status: "too-large"; readonly bytes: number }
  /** Parsed and re-printed at the chosen indent. */
  | { readonly status: "ok"; readonly output: string }
  /** Not JSON: the browser's reason, and where it gave up. */
  | {
      readonly status: "invalid";
      /** The browser's own `SyntaxError` wording, unchanged. */
      readonly reason: string;
      readonly line: number;
      readonly column: number;
      readonly lineText: string;
    };

/**
 * Re-print `input` as JSON at the chosen indent.
 *
 * The checks run in the order a visitor would expect to be told about them:
 * has anything been pasted, is it small enough to format, is it JSON. The size
 * check comes before parsing on purpose — an oversized document is refused
 * without `JSON.parse` ever seeing it.
 */
export function beautifyJson(
  input: string,
  indent: IndentChoice,
): JsonBeautifyResult {
  if (input.trim().length === 0) {
    return { status: "empty" };
  }

  const bytes = inputByteLength(input);
  if (bytes > MAX_INPUT_BYTES) {
    return { status: "too-large", bytes };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "invalid",
      reason,
      ...positionFromSyntaxError(reason, input),
    };
  }

  // `null` as the replacer: every key is kept, in the order it was parsed.
  return {
    status: "ok",
    output: JSON.stringify(parsed, null, indentValue(indent)),
  };
}

/* -------------------------------------------------------------------------- */
/* Reading a position out of a browser's SyntaxError                          */
/* -------------------------------------------------------------------------- */

/** Chromium and WebKit: "... in JSON at position 7". */
const AT_POSITION = /\bat position (\d+)/i;

/**
 * Firefox: "... at line 2 column 3 of the JSON data". Recent Chromium also
 * appends "(line 2 column 3)" after the position, which this reads just as
 * happily.
 */
const AT_LINE_COLUMN = /\bline (\d+) column (\d+)/i;

/**
 * Chromium's other shape, which carries no position at all but quotes a window
 * of the document around the failure:
 *
 *     Unexpected token ',', ..." "score": ,\n  "notes"... is not valid JSON
 *
 * The leading `...` marks a window that does not start at the beginning of the
 * document; when it is there, the window begins exactly
 * {@link CONTEXT_CHARS_BEFORE} characters before the offending character.
 */
const QUOTED_CONTEXT = /,\s(\.\.\.)?"([\s\S]*)"(?:\.\.\.)? is not valid JSON/;

/** The offending character Chromium names: "Unexpected token ',', ...". */
const UNEXPECTED_TOKEN = /unexpected token '([\s\S])'/i;

/** A document that simply stops: no position is reported, so we use the end. */
const UNEXPECTED_END =
  /unexpected end of (?:json input|data|input)|unexpected eof/i;

/** How much of the document Chromium shows before the offending character. */
const CONTEXT_CHARS_BEFORE = 10;

/**
 * Work out where parsing stopped from the browser's message and the input it
 * was given.
 *
 * Every known shape is tried in turn, most explicit first, and the answer is
 * always a real position in this document — line 1, column 1 when the message
 * says nothing we can use, because a wrong number would be worse than a
 * modest one. The caller keeps the browser's reason text either way.
 */
export function positionFromSyntaxError(
  message: string,
  input: string,
): JsonErrorPosition {
  const position = AT_POSITION.exec(message);
  if (position !== null) {
    return offsetToLineColumn(input, Number(position[1]));
  }

  const lineColumn = AT_LINE_COLUMN.exec(message);
  if (lineColumn !== null) {
    return positionAtLine(input, Number(lineColumn[1]), Number(lineColumn[2]));
  }

  const fromContext = offsetFromQuotedContext(message, input);
  if (fromContext !== undefined) {
    return offsetToLineColumn(input, fromContext);
  }

  if (UNEXPECTED_END.test(message)) {
    return offsetToLineColumn(input, input.length);
  }

  return offsetToLineColumn(input, 0);
}

/**
 * The offset of the offending character, recovered from the window Chromium
 * quotes in its message, or `undefined` when the message is not that shape or
 * the window cannot be found in the input.
 *
 * Where the window is truncated at the front the arithmetic is exact. Where it
 * is not — the failure is in the first few characters, so Chromium quotes the
 * document from its start — the offending character is looked for instead,
 * taking the last candidate inside the window so that `[1,,2]` blames the
 * second comma rather than the first.
 */
function offsetFromQuotedContext(
  message: string,
  input: string,
): number | undefined {
  const match = QUOTED_CONTEXT.exec(message);
  if (match === null) {
    return undefined;
  }

  const snippet = match[2] ?? "";
  if (snippet.length === 0) {
    return undefined;
  }

  // Repeated content can make the window ambiguous; the first occurrence is at
  // least deterministic, and the reason text is the browser's regardless.
  const windowStart = input.indexOf(snippet);
  if (windowStart < 0) {
    return undefined;
  }

  const truncatedAtFront = match[1] !== undefined;
  if (truncatedAtFront) {
    return windowStart + CONTEXT_CHARS_BEFORE;
  }

  const token = UNEXPECTED_TOKEN.exec(message)?.[1];
  if (token === undefined) {
    return undefined;
  }

  const searchFrom = Math.min(
    windowStart + snippet.length - 1,
    CONTEXT_CHARS_BEFORE,
  );
  const found = input.lastIndexOf(token, searchFrom);
  return found < 0 ? undefined : found;
}

/* -------------------------------------------------------------------------- */
/* Offsets, lines and columns                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The offset each line of `input` starts at. A carriage return and line feed
 * together count as one break, so a document saved on Windows does not report
 * twice as many lines as it has.
 */
function lineStarts(input: string): readonly number[] {
  const starts: number[] = [0];

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === "\r") {
      if (input[index + 1] === "\n") {
        index += 1;
      }
      starts.push(index + 1);
    } else if (character === "\n") {
      starts.push(index + 1);
    }
  }

  return starts;
}

/** The text of the line beginning at `start`, up to but not into its break. */
function lineTextFrom(input: string, start: number): string {
  let end = start;
  while (end < input.length) {
    const character = input[end];
    if (character === "\n" || character === "\r") {
      break;
    }
    end += 1;
  }
  return truncateLine(input.slice(start, end));
}

/** Keep a quoted line short enough to show (see {@link LINE_TEXT_LIMIT}). */
function truncateLine(text: string): string {
  return text.length > LINE_TEXT_LIMIT
    ? `${text.slice(0, LINE_TEXT_LIMIT)}…`
    : text;
}

/**
 * Convert a character offset into a 1-based line and column, with the text of
 * that line.
 *
 * The offset is clamped into the document, so the end-of-input case (which
 * reports the offset one past the last character) lands on the last line. An
 * offset that falls on a line break belongs to the line the break ends.
 */
export function offsetToLineColumn(
  input: string,
  offset: number,
): JsonErrorPosition {
  const target = Number.isFinite(offset)
    ? Math.min(Math.max(Math.trunc(offset), 0), input.length)
    : 0;

  const starts = lineStarts(input);
  let lineIndex = 0;
  for (let index = 0; index < starts.length; index += 1) {
    if ((starts[index] ?? 0) > target) {
      break;
    }
    lineIndex = index;
  }

  const start = starts[lineIndex] ?? 0;
  return {
    line: lineIndex + 1,
    column: target - start + 1,
    lineText: lineTextFrom(input, start),
  };
}

/**
 * The position for a line and column a parser reported directly (Firefox).
 *
 * Both are clamped to something real: the line to the document's last line and
 * the column to 1 at least, because the failure has to quote a line that
 * exists.
 */
function positionAtLine(
  input: string,
  line: number,
  column: number,
): JsonErrorPosition {
  const starts = lineStarts(input);
  const lineIndex =
    Math.min(Math.max(Number.isFinite(line) ? line : 1, 1), starts.length) - 1;
  const start = starts[lineIndex] ?? 0;

  return {
    line: lineIndex + 1,
    column: Math.max(Number.isFinite(column) ? Math.trunc(column) : 1, 1),
    lineText: lineTextFrom(input, start),
  };
}

/* -------------------------------------------------------------------------- */
/* What the screen says                                                       */
/* -------------------------------------------------------------------------- */

/** Shown when Beautify is pressed with nothing pasted (REQ-8). */
export const EMPTY_INPUT_MESSAGE = "Paste some JSON first";

/** Shown when the input is over the 1 MB cap and was not formatted (REQ-8). */
export const TOO_LARGE_MESSAGE =
  "That input is larger than 1 MB, so it was not formatted";

/**
 * The inline message for a failed parse: the browser's reason, then where it
 * gave up. Trailing punctuation is trimmed off the reason so the two halves
 * read as one sentence whichever browser wrote the first half.
 */
export function invalidJsonMessage(failure: {
  readonly reason: string;
  readonly line: number;
  readonly column: number;
}): string {
  const reason = failure.reason.trim().replace(/[.:;,\s]+$/, "");
  return `${reason} — Line ${failure.line}, column ${failure.column}`;
}
