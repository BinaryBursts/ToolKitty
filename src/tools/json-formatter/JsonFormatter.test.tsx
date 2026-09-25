import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_INPUT_MESSAGE, TOO_LARGE_MESSAGE } from "@/lib/jsonFormat";

import { JsonFormatter } from "./JsonFormatter";

/** The box the visitor pastes into. */
const input = (): HTMLTextAreaElement =>
  screen.getByLabelText("Paste your JSON") as HTMLTextAreaElement;

/** The read-only box the formatted document appears in. */
const outputBox = (): HTMLTextAreaElement =>
  screen.getByLabelText("Formatted output") as HTMLTextAreaElement;

/** What the output box currently holds. */
const output = (): string => outputBox().value;

/** Paste (or type) into the input box. */
function paste(value: string) {
  fireEvent.change(input(), { target: { value } });
}

/** Press Beautify. */
function beautify() {
  fireEvent.click(screen.getByRole("button", { name: /Beautify/ }));
}

/** Choose one of the three indents. */
function pickIndent(label: string) {
  fireEvent.click(
    screen.getByRole("radio", { name: label, hidden: false }) as HTMLElement,
  );
}

/** The copy control. */
const copyButton = (): HTMLButtonElement =>
  screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement;

/** Put a clipboard on the test's navigator, as CopyButton's own tests do. */
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}

/** The sample REQ-8's acceptance criteria use. */
const SAMPLE = '{"b":1,"a":[1,2]}';

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("JsonFormatter", () => {
  it("opens empty, on 2 spaces, with nothing to copy", () => {
    render(<JsonFormatter />);

    expect(input()).toHaveValue("");
    expect(output()).toBe("");
    expect(screen.getByRole("radio", { name: "2 spaces" })).toBeChecked();
    expect(copyButton()).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("re-prints valid JSON at two spaces, keys in the order they were pasted", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    beautify();

    expect(output()).toBe('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
    expect(output().indexOf('"b"')).toBeLessThan(output().indexOf('"a"'));
  });

  it("re-renders the same document at the new indent when Beautify is pressed again", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    beautify();
    expect(output()).toContain('\n  "b": 1');

    pickIndent("Tab");
    // Switching the indent alone changes nothing: formatting is an explicit
    // press (REQ-8).
    expect(output()).toContain('\n  "b": 1');

    beautify();
    expect(output()).toBe('{\n\t"b": 1,\n\t"a": [\n\t\t1,\n\t\t2\n\t]\n}');

    pickIndent("4 spaces");
    beautify();
    expect(output()).toBe(
      '{\n    "b": 1,\n    "a": [\n        1,\n        2\n    ]\n}',
    );
  });

  it("shows a reason, a line and column and the offending line when it will not parse", () => {
    render(<JsonFormatter />);

    paste('{"a": }');
    beautify();

    const alert = screen.getByRole("alert");

    // The reason is the browser's own words, whatever they are, followed by
    // the position the parser gave up at.
    expect(alert.textContent).toMatch(/Line 1, column \d+/);
    expect(
      alert.textContent?.replace(/Line 1, column \d+/, "").trim().length,
    ).toBeGreaterThan(0);

    // The offending line, quoted with a caret under the column.
    const quoted = alert.querySelector("pre")?.textContent ?? "";
    expect(quoted).toContain('1 | {"a": }');
    expect(quoted).toContain("^");

    // Nothing is formatted, and the output box is not put into an error state.
    expect(output()).toBe("");
    expect(outputBox().className).not.toContain("o-input--error");
    expect(outputBox()).not.toHaveAttribute("aria-invalid", "true");
  });

  it("clears a previous result when the next document does not parse", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    beautify();
    expect(output()).not.toBe("");

    paste("{nope}");
    beautify();

    expect(output()).toBe("");
    expect(copyButton()).toBeDisabled();
  });

  it("asks for JSON, quietly, when Beautify is pressed with an empty box", () => {
    render(<JsonFormatter />);

    beautify();

    const message = screen.getByText(EMPTY_INPUT_MESSAGE);

    // A note, not a failure: neither the alert role nor the danger styling.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(message.closest(".o-alert")?.className).not.toContain(
      "o-alert--danger",
    );
    expect(output()).toBe("");
    expect(outputBox().className).not.toContain("o-input--error");
  });

  it("treats whitespace alone as an empty box", () => {
    render(<JsonFormatter />);

    paste("   \n  ");
    beautify();

    expect(screen.getByText(EMPTY_INPUT_MESSAGE)).toBeInTheDocument();
    expect(output()).toBe("");
  });

  it("refuses a document over the 1 MB cap instead of formatting it", () => {
    render(<JsonFormatter />);

    // Valid JSON, but past the cap: the size is what refuses it, not the shape.
    paste(`["${"a".repeat(1_100_000)}"]`);
    beautify();

    expect(screen.getByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(output()).toBe("");
  });

  it("empties the input, the output and the message on Clear", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    pickIndent("Tab");
    beautify();
    expect(output()).not.toBe("");

    // A message to clear as well as a result.
    paste("{nope}");
    beautify();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));

    expect(input()).toHaveValue("");
    expect(output()).toBe("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2 spaces" })).toBeChecked();
  });

  it("copies exactly the formatted output", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<JsonFormatter />);
    paste(SAMPLE);
    beautify();

    const formatted = output();

    await act(async () => {
      copyButton().click();
    });

    expect(writeText).toHaveBeenCalledWith(formatted);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("has nothing to copy until something has been formatted", () => {
    render(<JsonFormatter />);

    expect(copyButton()).toBeDisabled();

    paste(SAMPLE);
    beautify();
    expect(copyButton()).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(copyButton()).toBeDisabled();
  });

  it("keeps the output read-only and selectable, never disabled", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    beautify();
    const formatted = output();

    expect(outputBox()).toHaveAttribute("readonly");
    expect(outputBox()).not.toBeDisabled();

    // A keystroke in the output box changes nothing: edits are made above and
    // beautified again.
    fireEvent.input(outputBox(), { target: { value: "edited" } });
    expect(output()).toBe(formatted);
  });

  it("describes the input with the live message region", () => {
    render(<JsonFormatter />);

    const describedBy = input().getAttribute("aria-describedby") ?? "";
    const region = describedBy
      .split(" ")
      .map((id) => document.getElementById(id))
      .find((element) => element?.getAttribute("aria-live") === "polite");

    expect(region).not.toBeNull();

    beautify();
    expect(region?.textContent).toContain(EMPTY_INPUT_MESSAGE);
  });

  it("marks the input, not the output, when the document will not parse", () => {
    render(<JsonFormatter />);

    paste("{nope}");
    beautify();

    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(outputBox()).not.toHaveAttribute("aria-invalid", "true");
  });
});

/**
 * REQ-8's promise about the data: paste only, in the browser, nothing kept.
 */
describe("JsonFormatter takes nothing in and sends nothing out", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("offers no file input, no drop target and no URL field", () => {
    const { container } = render(<JsonFormatter />);

    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(container.querySelectorAll('input[type="url"]')).toHaveLength(0);
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(
      container.querySelectorAll("[ondrop], [data-dropzone]"),
    ).toHaveLength(0);

    // The only text boxes on the tool are the two it is made of, and neither
    // takes a URL to fetch.
    const boxes = Array.from(container.querySelectorAll("textarea"));
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      expect(box.type).toBe("textarea");
    }
  });

  it("makes no request while a document is pasted and beautified", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const sendBeacon = vi.fn();
    vi.stubGlobal("navigator", navigator);
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    const open = vi.spyOn(XMLHttpRequest.prototype, "open");
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<JsonFormatter />);
    paste(SAMPLE);
    beautify();
    await act(async () => {
      copyButton().click();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("writes to no storage and sets no cookie while it is used", () => {
    const cookiesBefore = document.cookie;

    render(<JsonFormatter />);
    paste(SAMPLE);
    pickIndent("4 spaces");
    beautify();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookiesBefore);
  });

  it("comes back empty when the page is loaded again", () => {
    const first = render(<JsonFormatter />);

    paste(SAMPLE);
    pickIndent("Tab");
    beautify();
    expect(output()).not.toBe("");

    // A reload is a fresh mount with nothing carried over.
    first.unmount();
    render(<JsonFormatter />);

    expect(input()).toHaveValue("");
    expect(output()).toBe("");
    expect(screen.getByRole("radio", { name: "2 spaces" })).toBeChecked();
  });
});

describe("the screen around the beautifier", () => {
  it("draws the quick facts and questions the approved screen shows", () => {
    render(<JsonFormatter />);

    expect(screen.getByText("1 MB cap")).toBeInTheDocument();
    expect(screen.getByText("Order kept")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Is my JSON uploaded anywhere?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Can I upload a file or point it at a URL?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Will it sort or clean up my keys?",
      }),
    ).toBeInTheDocument();
  });

  it("shows how big the pasted document is against the cap", () => {
    render(<JsonFormatter />);

    expect(screen.getByText("0 bytes of 1 MB")).toBeInTheDocument();

    paste(SAMPLE);
    expect(screen.getByText("17 bytes of 1 MB")).toBeInTheDocument();
  });

  it("says how many lines a formatted document came out as", () => {
    render(<JsonFormatter />);

    paste(SAMPLE);
    beautify();

    expect(screen.getByText("Valid JSON · 7 lines")).toBeInTheDocument();
  });
});
