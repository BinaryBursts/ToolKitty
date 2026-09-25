"use client";

import { useId, useState } from "react";

import {
  Button,
  CheckIcon,
  CloseIcon,
  CopyButton,
  Field,
  InlineMessage,
  SegmentedSelect,
  Textarea,
  type SegmentedOption,
} from "@/components/ui";
import { cx } from "@/lib/classNames";
import {
  beautifyJson,
  DEFAULT_INDENT,
  EMPTY_INPUT_MESSAGE,
  INDENT_CHOICES,
  inputByteLength,
  invalidJsonMessage,
  MAX_INPUT_BYTES,
  TOO_LARGE_MESSAGE,
  type IndentChoice,
} from "@/lib/jsonFormat";

/**
 * JSON beautifier (REQ-8), drawn as the approved JSON beautifier screen.
 *
 * The whole tool is the four pieces of state below — the text as it was
 * pasted, the indent chosen for it, the last formatted output and the last
 * message — and one call to {@link beautifyJson}. There is no effect, no
 * fetch, no upload control and no write to storage anywhere in this file:
 * people paste API responses and config here, which is exactly the data that
 * must not leave the machine, so reloading the page leaves both boxes empty
 * and nothing about the document is kept.
 *
 * Parsing, re-printing and the line-and-column reporting are not here either:
 * they are `@/lib/jsonFormat`, proved by its own tests. This component's job
 * is to show what that module returns.
 *
 * Formatting happens on an explicit press of Beautify rather than on every
 * keystroke (REQ-8's behaviour) — unlike the converters, whose results are
 * live — because a megabyte of JSON re-printed on each character typed would
 * stall the tab.
 */

/** Held between a press of Beautify and the next one. Nothing is persisted. */
type ToolState = {
  /** The text exactly as pasted or typed. */
  readonly input: string;
  /** Which indent the next press of Beautify will use. */
  readonly indent: IndentChoice;
  /** The last successful output, or "" when there is none. */
  readonly output: string;
  /** What to tell the visitor, or `null` when there is nothing to say. */
  readonly message: ToolMessage | null;
};

/**
 * `neutral` is an ordinary note — nothing pasted yet, the document is over the
 * cap — and `error` is a document that did not parse. They are different
 * styles on purpose: an empty box is not a mistake (REQ-8).
 */
type ToolMessage =
  | { readonly kind: "neutral"; readonly text: string }
  | {
      readonly kind: "error";
      readonly text: string;
      /** The offending line quoted with a caret under the column. */
      readonly quotedLine: string;
    };

const INITIAL_STATE: ToolState = {
  input: "",
  indent: DEFAULT_INDENT,
  output: "",
  message: null,
};

const INDENT_OPTIONS: ReadonlyArray<SegmentedOption<IndentChoice>> =
  INDENT_CHOICES.map((choice) => ({ value: choice.id, label: choice.label }));

/** Shown in the output box before anything has been formatted. */
const OUTPUT_PLACEHOLDER = "Output appears here once the JSON parses.";

/**
 * The offending line, quoted under the error with a caret at the column the
 * parser stopped at:
 *
 * ```text
 * 3 |     "a": }
 *   |           ^
 * ```
 *
 * The caret is padded with the line's own tabs kept as tabs, so a document
 * indented with tabs still lines up in the monospaced block. A column past the
 * end of the quoted line — the line was truncated, or parsing stopped at the
 * end of the document — puts the caret just after it rather than off it.
 */
export function quoteOffendingLine(failure: {
  readonly line: number;
  readonly column: number;
  readonly lineText: string;
}): string {
  const gutter = String(failure.line);
  const blankGutter = " ".repeat(gutter.length);

  const upToColumn = Array.from(failure.lineText).slice(
    0,
    Math.max(failure.column - 1, 0),
  );
  const caretPad = upToColumn
    .map((character) => (character === "\t" ? "\t" : " "))
    .join("");

  return `${gutter} | ${failure.lineText}\n${blankGutter} | ${caretPad}^`;
}

/** "812 bytes", "4.2 KB", "1.1 MB" — the size beside the input's label. */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** How many lines the formatted document came out as. */
function countLines(output: string): number {
  return output === "" ? 0 : output.split("\n").length;
}

export function JsonFormatter() {
  const [state, setState] = useState<ToolState>(INITIAL_STATE);
  const { input, indent, output, message } = state;

  // One id per instance, so the live region can be named as the input's
  // description, and the output's visible label tied to the box it names,
  // without two tools on a page colliding.
  const instanceId = useId();
  const messageId = `${instanceId}-message`;
  const outputId = `${instanceId}-output`;

  const bytes = inputByteLength(input);
  const overCap = bytes > MAX_INPUT_BYTES;

  /**
   * Re-print what is in the input box at the chosen indent. Every branch of
   * the module's answer is shown: a document that parsed replaces the output,
   * and one that did not leaves the output empty rather than showing a stale
   * result beside a fresh error.
   */
  function beautify() {
    const result = beautifyJson(input, indent);

    switch (result.status) {
      case "ok":
        setState((previous) => ({
          ...previous,
          output: result.output,
          message: null,
        }));
        break;

      case "empty":
        setState((previous) => ({
          ...previous,
          output: "",
          message: { kind: "neutral", text: EMPTY_INPUT_MESSAGE },
        }));
        break;

      case "too-large":
        setState((previous) => ({
          ...previous,
          output: "",
          message: { kind: "neutral", text: TOO_LARGE_MESSAGE },
        }));
        break;

      case "invalid":
        setState((previous) => ({
          ...previous,
          output: "",
          message: {
            kind: "error",
            text: invalidJsonMessage(result),
            quotedLine: quoteOffendingLine(result),
          },
        }));
        break;
    }
  }

  /** Back to how the tool opened: both boxes empty and nothing said. */
  function clear() {
    setState(INITIAL_STATE);
  }

  const invalid = message?.kind === "error";

  return (
    <div className="o-stack">
      <div className="t-device">
        <div className="t-device__head o-spread">
          <div className="o-row">
            <span className="o-badge o-badge--primary">
              Parsed in your browser
            </span>
            <span className="o-small o-muted o-hide-mobile">
              Paste only — no file upload, no URL fetch
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={clear}>
            <CloseIcon size={16} />
            Clear
          </Button>
        </div>

        <div className="o-stack">
          <div className="t-block o-stack">
            <Field
              label="Paste your JSON"
              help="Typed or pasted text only. Inputs over 1 MB are refused rather than formatted."
            >
              <Textarea
                rows={8}
                className="o-mono"
                style={{ width: "100%", lineHeight: 1.7 }}
                spellCheck={false}
                autoComplete="off"
                placeholder='{"order":"TK-4821","total":38.99}'
                aria-describedby={messageId}
                aria-invalid={invalid ? true : undefined}
                value={input}
                onChange={(event) => {
                  const next = event.target.value;
                  setState((previous) => ({ ...previous, input: next }));
                }}
              />
            </Field>

            <p
              className={cx("o-small o-mono", overCap ? "o-error" : "o-muted")}
              style={{ margin: 0 }}
            >
              {formatByteSize(bytes)} of 1 MB
            </p>
          </div>

          <div
            className="o-spread"
            style={{ gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}
          >
            <div className="o-stack--tight">
              <span className="o-small o-muted">Indent</span>
              <SegmentedSelect
                label="Indent"
                options={INDENT_OPTIONS}
                value={indent}
                onChange={(next) => {
                  setState((previous) => ({ ...previous, indent: next }));
                }}
              />
            </div>

            <Button variant="primary" size="lg" onClick={beautify}>
              <CheckIcon size={16} />
              Beautify
            </Button>
          </div>

          {/* Always in the document, so a message appearing inside it is
              announced rather than the region itself arriving unnoticed. It is
              the input's `aria-describedby`, so the reason a document was
              refused is read out with the box it was pasted into. */}
          <div id={messageId} aria-live="polite">
            {message === null ? null : message.kind === "neutral" ? (
              <InlineMessage variant="info">{message.text}</InlineMessage>
            ) : (
              <InlineMessage variant="error" title={message.text}>
                <pre
                  className="o-mono"
                  style={{
                    margin: 0,
                    fontSize: "0.86rem",
                    lineHeight: 1.7,
                    overflowX: "auto",
                  }}
                >
                  {message.quotedLine}
                </pre>
              </InlineMessage>
            )}
          </div>

          <div className="t-block o-stack">
            <div
              className="o-spread"
              style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <div
                className="o-row"
                style={{ gap: 10, alignItems: "baseline" }}
              >
                <label className="o-label" htmlFor={outputId}>
                  Formatted output
                </label>
                {output === "" ? null : (
                  <span className="o-badge o-badge--success">
                    Valid JSON · {countLines(output)} lines
                  </span>
                )}
              </div>
              <div className="o-row" style={{ gap: 10 }}>
                <span className="o-small o-muted o-hide-mobile">
                  Read-only — edit above and beautify again
                </span>
                <CopyButton
                  value={output}
                  label="Copy"
                  variant="secondary"
                  size="sm"
                  disabled={output === ""}
                />
              </div>
            </div>

            {/* Read-only rather than disabled: the formatted text stays
                selectable, which is what makes a manual copy possible when the
                clipboard API is not available. `wrap="off"` keeps the indent
                the visitor chose — long lines scroll inside the box instead of
                being re-wrapped into something that never parsed that way. */}
            <Textarea
              id={outputId}
              readOnly
              wrap="off"
              rows={14}
              className="o-mono"
              style={{ width: "100%", lineHeight: 1.75 }}
              spellCheck={false}
              placeholder={OUTPUT_PLACEHOLDER}
              value={output}
            />
          </div>
        </div>
      </div>

      <div className="o-section o-grid o-grid--3">
        <div className="t-fact t-fact--clay o-stack--tight">
          <div className="t-fact__value">1 MB cap</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Anything larger says so instead of freezing your tab.
          </p>
        </div>
        <div className="t-fact t-fact--mint o-stack--tight">
          <div className="t-fact__value">Order kept</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Keys come out exactly as they went in — never alphabetised.
          </p>
        </div>
        <div className="t-fact t-fact--sky o-stack--tight">
          <div className="t-fact__value">3 indent styles</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            2 spaces, 4 spaces or a real tab character — press Beautify again to
            switch.
          </p>
        </div>
      </div>

      <section className="o-section o-stack t-copy">
        <h2 className="o-h2">Common questions</h2>

        <div className="t-faq">
          <h3 className="t-faq__q">Is my JSON uploaded anywhere?</h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            No. Parsing and printing both happen in your browser, so you can
            paste a production payload with the network disconnected. Nothing is
            stored and nothing survives a reload.
          </p>
        </div>

        <div className="t-faq">
          <h3 className="t-faq__q">
            Can I upload a file or point it at a URL?
          </h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            No — paste or type only. There is no file picker and no fetch box
            anywhere on this page, which is what lets us promise your data never
            leaves the device.
          </p>
        </div>

        <div className="t-faq">
          <h3 className="t-faq__q">Will it sort or clean up my keys?</h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            Never. Keys come out in the order they were parsed, duplicates and
            all. The only thing that changes is whitespace.
          </p>
        </div>
      </section>
    </div>
  );
}

export default JsonFormatter;
