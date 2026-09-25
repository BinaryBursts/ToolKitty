import { afterEach, describe, expect, it, vi } from "vitest";

import {
  beautifyJson,
  DEFAULT_INDENT,
  EMPTY_INPUT_MESSAGE,
  INDENT_CHOICES,
  indentValue,
  inputByteLength,
  invalidJsonMessage,
  LINE_TEXT_LIMIT,
  MAX_INPUT_BYTES,
  offsetToLineColumn,
  positionFromSyntaxError,
  TOO_LARGE_MESSAGE,
  type IndentChoice,
  type JsonBeautifyResult,
} from "./jsonFormat";

/** The formatted output, or a failure the test did not expect. */
function formatted(input: string, indent: IndentChoice = "two-spaces"): string {
  const result = beautifyJson(input, indent);
  if (result.status !== "ok") {
    throw new Error(`expected ${input} to format, got ${result.status}`);
  }
  return result.output;
}

/** The failure, or an error if the input formatted after all. */
function failure(
  input: string,
  indent: IndentChoice = "two-spaces",
): Extract<JsonBeautifyResult, { status: "invalid" }> {
  const result = beautifyJson(input, indent);
  if (result.status !== "invalid") {
    throw new Error(`expected ${input} to be invalid, got ${result.status}`);
  }
  return result;
}

/**
 * A document whose fifth line has a missing value — the multi-line fixture the
 * line-and-column reporting is measured against.
 */
const MISSING_VALUE_ON_LINE_5 = [
  "{",
  '  "name": "Ada",',
  '  "roles": ["admin", "editor"],',
  '  "active": true,',
  '  "score": ,',
  '  "notes": "ok"',
  "}",
].join("\n");

/** The same document, but with the fifth line's key left unquoted. */
const UNQUOTED_KEY_ON_LINE_5 = [
  "{",
  '  "name": "Ada",',
  '  "roles": ["admin", "editor"],',
  '  "active": true,',
  "  score: 10,",
  '  "notes": "ok"',
  "}",
].join("\n");

describe("INDENT_CHOICES", () => {
  it("offers the three indents REQ-8 names, in selector order", () => {
    expect(INDENT_CHOICES.map((choice) => choice.id)).toEqual([
      "two-spaces",
      "four-spaces",
      "tab",
    ]);
    expect(INDENT_CHOICES.map((choice) => choice.label)).toEqual([
      "2 spaces",
      "4 spaces",
      "Tab",
    ]);
  });

  it("starts a visitor on 2 spaces", () => {
    expect(DEFAULT_INDENT).toBe("two-spaces");
    expect(INDENT_CHOICES[0]?.id).toBe(DEFAULT_INDENT);
  });
});

describe("indentValue", () => {
  it.each([
    { choice: "two-spaces", value: 2 },
    { choice: "four-spaces", value: 4 },
    { choice: "tab", value: "\t" },
  ] as const)("maps $choice to $value", ({ choice, value }) => {
    expect(indentValue(choice)).toBe(value);
  });
});

describe("inputByteLength", () => {
  it("counts ASCII as one byte each", () => {
    expect(inputByteLength("[1,2]")).toBe(5);
  });

  it("counts multi-byte characters by their UTF-8 bytes", () => {
    // "é" is two bytes, "😀" is four — a document of them is larger than its
    // count of JavaScript characters suggests.
    expect(inputByteLength('"é"')).toBe(4);
    expect(inputByteLength('"😀"')).toBe(6);
  });

  it("puts the cap at 1 MB", () => {
    expect(MAX_INPUT_BYTES).toBe(1_048_576);
  });
});

describe("beautifyJson, valid input", () => {
  it("re-prints with two spaces and keeps keys in the parsed order", () => {
    // REQ-8 AC1: b stays before a; nothing is sorted.
    expect(formatted('{"b":1,"a":[1,2]}')).toBe(
      ["{", '  "b": 1,', '  "a": [', "    1,", "    2", "  ]", "}"].join("\n"),
    );
  });

  it("re-prints the same content with four spaces", () => {
    expect(formatted('{"b":1,"a":[1,2]}', "four-spaces")).toBe(
      [
        "{",
        '    "b": 1,',
        '    "a": [',
        "        1,",
        "        2",
        "    ]",
        "}",
      ].join("\n"),
    );
  });

  it("re-prints the same content with tabs", () => {
    expect(formatted('{"b":1,"a":[1,2]}', "tab")).toBe(
      ["{", '\t"b": 1,', '\t"a": [', "\t\t1,", "\t\t2", "\t]", "}"].join("\n"),
    );
  });

  it("indents every level of a nested document", () => {
    const output = formatted('{"a":{"b":{"c":[{"d":1}]}}}');

    expect(output).toBe(
      [
        "{",
        '  "a": {',
        '    "b": {',
        '      "c": [',
        "        {",
        '          "d": 1',
        "        }",
        "      ]",
        "    }",
        "  }",
        "}",
      ].join("\n"),
    );
  });

  it.each([
    { input: "42", output: "42" },
    { input: '"text"', output: '"text"' },
    { input: "true", output: "true" },
    { input: "null", output: "null" },
    { input: "-1.5e3", output: "-1500" },
  ])("re-prints the top-level scalar $input", ({ input, output }) => {
    expect(formatted(input)).toBe(output);
  });

  it("re-prints a top-level array", () => {
    expect(formatted("[1,2]")).toBe(["[", "  1,", "  2", "]"].join("\n"));
  });

  it("re-prints empty objects and arrays on one line, as JSON.stringify does", () => {
    expect(formatted('{"a":{},"b":[]}')).toBe(
      ["{", '  "a": {},', '  "b": []', "}"].join("\n"),
    );
  });

  it("formats an already-indented document at the new indent", () => {
    // REQ-8 behaviour 5: the same input re-beautified at another indent.
    const once = formatted('{"b":1,"a":[1,2]}');
    expect(formatted(once, "tab")).toBe(formatted('{"b":1,"a":[1,2]}', "tab"));
  });

  it("keeps surrounding whitespace out of the output", () => {
    expect(formatted('\n\t {"a":1}  \n')).toBe(
      ["{", '  "a": 1', "}"].join("\n"),
    );
  });

  it("keeps non-ASCII content exactly as parsed", () => {
    expect(formatted('{"name":"Ada 😀","note":"café"}')).toBe(
      ["{", '  "name": "Ada 😀",', '  "note": "café"', "}"].join("\n"),
    );
  });
});

describe("beautifyJson, empty input", () => {
  it.each(["", "   ", "\n\t \r\n"])(
    "reports %j as empty rather than invalid",
    (input) => {
      const result = beautifyJson(input, "two-spaces");
      expect(result.status).toBe("empty");
      expect(result.status).not.toBe("invalid");
    },
  );
});

describe("beautifyJson, oversized input", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses an input over 1 MB without parsing it", () => {
    const parse = vi.spyOn(JSON, "parse");
    const oversized = `"${"a".repeat(MAX_INPUT_BYTES)}"`;

    const result = beautifyJson(oversized, "two-spaces");

    expect(result).toEqual({
      status: "too-large",
      bytes: MAX_INPUT_BYTES + 2,
    });
    expect(parse).not.toHaveBeenCalled();
  });

  it("measures the cap in UTF-8 bytes, not characters", () => {
    // 600_000 two-byte characters: well under 1_048_576 characters, well over
    // 1_048_576 bytes.
    const multiByte = `"${"é".repeat(600_000)}"`;

    expect(multiByte.length).toBeLessThan(MAX_INPUT_BYTES);
    expect(beautifyJson(multiByte, "two-spaces").status).toBe("too-large");
  });

  it("formats an input of exactly 1 MB", () => {
    const exact = `"${"a".repeat(MAX_INPUT_BYTES - 2)}"`;

    expect(inputByteLength(exact)).toBe(MAX_INPUT_BYTES);
    expect(beautifyJson(exact, "two-spaces").status).toBe("ok");
  });

  it("reports an oversized whitespace-only input as empty", () => {
    expect(
      beautifyJson(" ".repeat(MAX_INPUT_BYTES + 10), "two-spaces").status,
    ).toBe("empty");
  });
});

describe("beautifyJson, invalid input", () => {
  it.each([
    { name: "a missing value", input: '{"a": }' },
    { name: "a trailing comma", input: '{"a":1,}' },
    { name: "an unquoted key", input: "{a:1}" },
    { name: "a truncated document", input: '{"a": 1' },
    { name: "a truncated array", input: "[1, 2" },
    { name: "a doubled comma", input: "[1,,2]" },
    { name: "trailing junk", input: '{"a":1} oops' },
  ])("reports $name with a reason and a position", ({ input }) => {
    const result = failure(input);

    expect(result.reason.length).toBeGreaterThan(0);
    expect(result.line).toBeGreaterThanOrEqual(1);
    expect(result.column).toBeGreaterThanOrEqual(1);
    expect(typeof result.lineText).toBe("string");
    // The failure carries no output — the screen leaves its output area empty.
    expect(result).not.toHaveProperty("output");
  });

  it("points at the fifth line of a multi-line document", () => {
    const result = failure(MISSING_VALUE_ON_LINE_5);

    expect(result.line).toBe(5);
    expect(result.lineText).toBe('  "score": ,');
    // The column is inside that line, wherever this browser says parsing gave
    // up within it.
    expect(result.column).toBeGreaterThanOrEqual(1);
    expect(result.column).toBeLessThanOrEqual(result.lineText.length + 1);
  });

  it("points at the fifth line when the key there is unquoted", () => {
    const result = failure(UNQUOTED_KEY_ON_LINE_5);

    expect(result.line).toBe(5);
    expect(result.lineText).toBe("  score: 10,");
  });

  it("quotes the offending line of a document with Windows line endings", () => {
    const result = failure('{\r\n  "a": 1,\r\n  "b": ,\r\n}');

    expect(result.line).toBe(3);
    expect(result.lineText).toBe('  "b": ,');
  });

  it("keeps the browser's own reason text", () => {
    let message = "";
    try {
      JSON.parse('{"a": }');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(failure('{"a": }').reason).toBe(message);
  });

  it("truncates a very long offending line", () => {
    const longLine = `{"pad":"${"x".repeat(400)}","a":}`;
    const result = failure(longLine);

    expect(result.lineText).toHaveLength(LINE_TEXT_LIMIT + 1);
    expect(result.lineText.endsWith("…")).toBe(true);
  });
});

describe("positionFromSyntaxError", () => {
  it("reads the character offset Chromium reports", () => {
    expect(
      positionFromSyntaxError(
        "Expected double-quoted property name in JSON at position 71",
        UNQUOTED_KEY_ON_LINE_5,
      ),
    ).toEqual({ line: 5, column: 3, lineText: "  score: 10," });
  });

  it("reads the line and column Firefox reports", () => {
    expect(
      positionFromSyntaxError(
        "JSON.parse: expected property name or '}' at line 2 column 3 of the JSON data",
        '{\n  "a": ,\n}',
      ),
    ).toEqual({ line: 2, column: 3, lineText: '  "a": ,' });
  });

  it("prefers the character offset when a message carries both", () => {
    // Newer Chromium appends "(line ... column ...)" after the position. The
    // two numbers here disagree on purpose — 8 is the true offset, the
    // parenthetical is deliberately wrong — so the test shows which is used.
    expect(
      positionFromSyntaxError(
        "Bad escaped character in JSON at position 8 (line 9 column 99)",
        '{\n  "a\\q": 1\n}',
      ),
    ).toEqual({ line: 2, column: 7, lineText: '  "a\\q": 1' });
  });

  it("recovers the position from the window Chromium quotes", () => {
    expect(
      positionFromSyntaxError(
        'Unexpected token \',\', ..." "score": ,\n  "notes"... is not valid JSON',
        MISSING_VALUE_ON_LINE_5,
      ),
    ).toEqual({ line: 5, column: 12, lineText: '  "score": ,' });
  });

  it("recovers the position from a window that is not truncated at the front", () => {
    expect(
      positionFromSyntaxError(
        'Unexpected token \'}\', "{"a": }" is not valid JSON',
        '{"a": }',
      ),
    ).toEqual({ line: 1, column: 7, lineText: '{"a": }' });
  });

  it("blames the second comma of [1,,2]", () => {
    expect(
      positionFromSyntaxError(
        "Unexpected token ',', \"[1,,2]\" is not valid JSON",
        "[1,,2]",
      ).column,
    ).toBe(4);
  });

  it("points at the end of a document that simply stops", () => {
    expect(
      positionFromSyntaxError("Unexpected end of JSON input", '{\n  "a": 1'),
    ).toEqual({ line: 2, column: 9, lineText: '  "a": 1' });
  });

  it("falls back to line 1, column 1 for a message it cannot read", () => {
    // WebKit's wording, which carries no position at all.
    expect(
      positionFromSyntaxError(
        "JSON Parse error: Expected '}'",
        '{\n  "a": 1,\n}',
      ),
    ).toEqual({ line: 1, column: 1, lineText: "{" });
  });

  it("falls back when the quoted window is not in the input", () => {
    expect(
      positionFromSyntaxError(
        "Unexpected token 'x', ...\"not from this document\"... is not valid JSON",
        '{"a": }',
      ),
    ).toEqual({ line: 1, column: 1, lineText: '{"a": }' });
  });
});

describe("offsetToLineColumn", () => {
  const CRLF_DOCUMENT = '{\r\n  "a": 1,\r\n  "b": 2\r\n}';
  const LF_DOCUMENT = '{\n  "a": 1,\n  "b": 2\n}';

  it("reports the first character as line 1, column 1", () => {
    expect(offsetToLineColumn(LF_DOCUMENT, 0)).toEqual({
      line: 1,
      column: 1,
      lineText: "{",
    });
  });

  it("reports an offset at the start of a line as column 1", () => {
    // Index 2 is the first character of the second line.
    expect(offsetToLineColumn(LF_DOCUMENT, 2)).toEqual({
      line: 2,
      column: 1,
      lineText: '  "a": 1,',
    });
  });

  it("reports an offset mid-line", () => {
    // Index 7 is the colon on the second line.
    expect(offsetToLineColumn(LF_DOCUMENT, 7)).toEqual({
      line: 2,
      column: 6,
      lineText: '  "a": 1,',
    });
  });

  it("counts a carriage-return/line-feed pair as one line break", () => {
    // Index 3 is the first character after the first CRLF pair.
    expect(offsetToLineColumn(CRLF_DOCUMENT, 3)).toEqual({
      line: 2,
      column: 1,
      lineText: '  "a": 1,',
    });
    // And after the second pair.
    expect(offsetToLineColumn(CRLF_DOCUMENT, 14)).toEqual({
      line: 3,
      column: 1,
      lineText: '  "b": 2',
    });
  });

  it("quotes a line without its carriage return", () => {
    expect(offsetToLineColumn(CRLF_DOCUMENT, 5).lineText).toBe('  "a": 1,');
  });

  it("clamps an offset past the end of the input to the last line", () => {
    const position = offsetToLineColumn(LF_DOCUMENT, 9_999);

    expect(position.line).toBe(4);
    expect(position.lineText).toBe("}");
  });

  it("treats a negative or unreadable offset as the start", () => {
    expect(offsetToLineColumn(LF_DOCUMENT, -5).line).toBe(1);
    expect(offsetToLineColumn(LF_DOCUMENT, Number.NaN)).toEqual({
      line: 1,
      column: 1,
      lineText: "{",
    });
  });

  it("truncates the quoted line at the display limit", () => {
    const line = "x".repeat(LINE_TEXT_LIMIT + 50);
    const position = offsetToLineColumn(line, 5);

    expect(position.lineText).toBe(`${"x".repeat(LINE_TEXT_LIMIT)}…`);
  });
});

describe("messages", () => {
  it("names the wording REQ-8 asks for", () => {
    expect(EMPTY_INPUT_MESSAGE).toBe("Paste some JSON first");
    expect(TOO_LARGE_MESSAGE).toBe(
      "That input is larger than 1 MB, so it was not formatted",
    );
  });

  it("puts the reason before the position", () => {
    expect(
      invalidJsonMessage({
        reason: "Unexpected token ',' is not valid JSON",
        line: 5,
        column: 12,
      }),
    ).toBe("Unexpected token ',' is not valid JSON — Line 5, column 12");
  });

  it("does not double the reason's own punctuation", () => {
    expect(
      invalidJsonMessage({
        reason: "Unexpected end of data.",
        line: 1,
        column: 1,
      }),
    ).toBe("Unexpected end of data — Line 1, column 1");
  });
});

describe("beautifyJson keeps the input on the machine", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("makes no network request and writes to no storage", () => {
    const fetchSpy = vi.fn();
    const xhrOpen = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        open = xhrOpen;
        send = vi.fn();
      },
    );
    const localSet = vi.spyOn(window.localStorage, "setItem");
    const sessionSet = vi.spyOn(window.sessionStorage, "setItem");

    for (const input of [
      '{"secret":"do not send me"}',
      '{"a": }',
      "",
      "   ",
      MISSING_VALUE_ON_LINE_5,
    ]) {
      for (const indent of INDENT_CHOICES) {
        beautifyJson(input, indent.id);
      }
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(sessionSet).not.toHaveBeenCalled();
  });

  it("gives the same answer every time, retaining nothing between calls", () => {
    const first = beautifyJson('{"b":1,"a":2}', "two-spaces");
    const second = beautifyJson('{"b":1,"a":2}', "two-spaces");

    expect(second).toEqual(first);
  });
});
