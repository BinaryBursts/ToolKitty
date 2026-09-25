import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COPY_CONFIRMATION_MS } from "@/components/ui";
import { CHARACTER_SETS } from "@/lib/password";

import {
  NO_CLASS_MESSAGE,
  PasswordGenerator,
  safeLength,
  UNSUPPORTED_MESSAGE,
} from "./PasswordGenerator";

/**
 * The password on screen. Read from the readout rather than from state, so
 * every assertion is about what a visitor can actually see and copy.
 */
const shown = (): string =>
  document.querySelector(".t-readout__value")?.textContent ?? "";

/** The number the kit prints beside the slider track. */
const shownLength = (): string =>
  document.querySelector(".t-slider__value")?.textContent ?? "";

const slider = (): HTMLInputElement =>
  screen.getByRole("slider", { name: "Length" }) as HTMLInputElement;

const toggleFor = (name: string): HTMLInputElement =>
  screen.getByRole("checkbox", {
    name: new RegExp(name),
  }) as HTMLInputElement;

const generateButton = (): HTMLButtonElement =>
  screen.getByRole("button", { name: /Generate/ }) as HTMLButtonElement;

const copyButton = (): HTMLButtonElement =>
  screen.getByRole("button", { name: /Copy password/ }) as HTMLButtonElement;

/** Drag the slider to a length. */
function setLength(value: number) {
  fireEvent.change(slider(), { target: { value: String(value) } });
}

/** Turn one character type on or off. */
function toggle(name: string) {
  fireEvent.click(toggleFor(name));
}

/** Press Generate. */
function generate() {
  fireEvent.click(generateButton());
}

/** Put a clipboard on the test's navigator, as CopyButton's own tests do. */
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}

/** Does this password contain a character from the named set? */
const hasClassOf = (password: string, set: string): boolean =>
  Array.from(password).some((character) => set.includes(character));

afterEach(() => {
  setClipboard(undefined);
  // Anything a test put on `navigator` or on a global comes off again, even
  // when the test failed part-way through.
  Reflect.deleteProperty(navigator, "sendBeacon");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PasswordGenerator", () => {
  it("arrives with a 16-character password containing all four classes", () => {
    render(<PasswordGenerator />);

    const password = shown();

    expect(password).toHaveLength(16);
    expect(hasClassOf(password, CHARACTER_SETS.uppercase)).toBe(true);
    expect(hasClassOf(password, CHARACTER_SETS.lowercase)).toBe(true);
    expect(hasClassOf(password, CHARACTER_SETS.digits)).toBe(true);
    expect(hasClassOf(password, CHARACTER_SETS.symbols)).toBe(true);

    expect(slider()).toHaveValue("16");
    expect(shownLength()).toBe("16");
    expect(screen.getByText(/Your password · 16 characters/)).toBeVisible();
  });

  it("generates the length the slider is dragged to, at both ends of the range", () => {
    render(<PasswordGenerator />);

    setLength(8);
    expect(shown()).toHaveLength(8);
    expect(shownLength()).toBe("8");

    setLength(64);
    expect(shown()).toHaveLength(64);
    expect(shownLength()).toBe("64");

    setLength(31);
    expect(shown()).toHaveLength(31);
    expect(shownLength()).toBe("31");
  });

  it("cannot be asked for a length outside 8 to 64", () => {
    render(<PasswordGenerator />);

    // The range input is what makes out-of-range values unselectable, by
    // dragging or with the arrow keys.
    expect(slider()).toHaveAttribute("type", "range");
    expect(slider()).toHaveAttribute("min", "8");
    expect(slider()).toHaveAttribute("max", "64");
    expect(slider()).toHaveAttribute("step", "1");
  });

  it("brings a length the DOM should not have produced back into range", () => {
    // The value arrives as a string and is treated as untrusted: the control's
    // own attributes are the first guard, not the only one.
    expect(safeLength("8")).toBe(8);
    expect(safeLength("64")).toBe(64);
    expect(safeLength("0")).toBe(8);
    expect(safeLength("-5")).toBe(8);
    expect(safeLength("1000")).toBe(64);
    expect(safeLength("20.7")).toBe(20);
    expect(safeLength("")).toBe(16);
    expect(safeLength("not a number")).toBe(16);
  });

  it("still shows a password when the slider reports a value out of range", () => {
    render(<PasswordGenerator />);

    // A tampered-with control must not be answered with the
    // "unsupported browser" message, which is what an unchecked length handed
    // to the generator would produce.
    fireEvent.change(slider(), { target: { value: "900" } });

    expect(shown()).toHaveLength(64);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });

  it("regenerates from the classes left on", () => {
    render(<PasswordGenerator />);

    toggle("Digits");
    toggle("Symbols");

    // Twenty consecutive generations, letters only (REQ-7).
    for (let attempt = 0; attempt < 20; attempt += 1) {
      generate();
      expect(shown()).toMatch(/^[A-Za-z]+$/);
    }

    expect(toggleFor("Uppercase")).toBeChecked();
    expect(toggleFor("Digits")).not.toBeChecked();
  });

  it("disables Generate and says why when every class is turned off, leaving the password alone", () => {
    render(<PasswordGenerator />);

    toggle("Uppercase");
    toggle("Digits");
    toggle("Symbols");

    // The last password made before there was nothing left to draw from.
    const before = shown();
    expect(before).not.toBe("");

    toggle("Lowercase");

    expect(shown()).toBe(before);
    expect(generateButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(NO_CLASS_MESSAGE);

    // One type back on and the tool starts working again.
    toggle("Digits");

    expect(generateButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shown()).not.toBe(before);
    expect(shown()).toMatch(/^[0-9]+$/);
  });

  it("produces a different password every time Generate is pressed", () => {
    render(<PasswordGenerator />);

    const seen = new Set<string>([shown()]);

    for (let press = 0; press < 20; press += 1) {
      generate();
      seen.add(shown());
    }

    expect(seen.size).toBe(21);
  });

  it("keeps no history: the previous password is gone once a new one is made", () => {
    const { container } = render(<PasswordGenerator />);

    const first = shown();
    generate();

    expect(container.textContent).not.toContain(first);
  });

  it("copies exactly the password on screen and clears the confirmation itself", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<PasswordGenerator />);

    const password = shown();

    await act(async () => {
      copyButton().click();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(password);
    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COPY_CONFIRMATION_MS + 100);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("tells the visitor to copy by hand when the clipboard refuses", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });

    render(<PasswordGenerator />);

    await act(async () => {
      copyButton().click();
    });

    expect(screen.getByText(/Copy failed/)).toBeInTheDocument();
  });

  it("generates nothing and says so where the browser has no Web Crypto API", () => {
    // The real check, against a browser that genuinely has no crypto object —
    // there is no fallback to weaker randomness anywhere behind it.
    vi.stubGlobal("crypto", undefined);

    render(<PasswordGenerator />);

    expect(screen.getByRole("alert")).toHaveTextContent(UNSUPPORTED_MESSAGE);
    expect(shown()).toBe("—");
    expect(generateButton()).toBeDisabled();
    expect(copyButton()).toBeDisabled();
  });

  it("puts the password back to defaults when Reset is pressed", () => {
    render(<PasswordGenerator />);

    setLength(40);
    toggle("Symbols");
    expect(shown()).toHaveLength(40);

    fireEvent.click(screen.getByRole("button", { name: /Reset to defaults/ }));

    expect(slider()).toHaveValue("16");
    expect(shown()).toHaveLength(16);
    expect(toggleFor("Symbols")).toBeChecked();
  });

  it("announces the new password politely and shows it in the mono face", () => {
    render(<PasswordGenerator />);

    const readout = document.querySelector(".t-readout__main");

    expect(readout).toHaveAttribute("aria-live", "polite");
    expect(readout).toContainElement(
      document.querySelector(".t-readout__value"),
    );
    expect(document.querySelector(".t-readout__value .o-mono")).not.toBeNull();
  });

  it("is operable from the keyboard: a native range, native checkboxes, real buttons", () => {
    const { container } = render(<PasswordGenerator />);

    // Arrow keys on the range, Space on the checkboxes and Enter on the
    // buttons all come from using the platform's own controls.
    expect(slider().tagName).toBe("INPUT");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      4,
    );
    for (const control of [
      slider(),
      toggleFor("Uppercase"),
      generateButton(),
      copyButton(),
    ]) {
      expect(control).not.toHaveAttribute("tabindex", "-1");
      expect(control).toBeEnabled();
    }

    // Every toggle has a visible label a pointer or a screen reader can use.
    for (const name of ["Uppercase", "Lowercase", "Digits", "Symbols"]) {
      expect(toggleFor(name)).toBeInTheDocument();
    }
    expect(slider()).toHaveAttribute("aria-valuetext", "16 characters");
  });

  it("makes no request while a password is generated and copied", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const sendBeacon = vi.fn();
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    const open = vi.spyOn(XMLHttpRequest.prototype, "open");
    const send = vi.spyOn(XMLHttpRequest.prototype, "send");
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<PasswordGenerator />);
    setLength(24);
    generate();
    await act(async () => {
      copyButton().click();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();

    // The password went to the clipboard and nowhere else.
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("writes the password to no storage, no cookie and no URL", () => {
    const cookiesBefore = document.cookie;
    const urlBefore = window.location.href;

    render(<PasswordGenerator />);
    setLength(32);
    toggle("Symbols");
    generate();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookiesBefore);
    expect(window.location.href).toBe(urlBefore);
    expect(window.location.search).toBe("");
  });

  it("comes back to its defaults when the page is loaded again", () => {
    const first = render(<PasswordGenerator />);

    setLength(48);
    toggle("Digits");
    const before = shown();

    // A reload is a fresh mount with nothing carried over.
    first.unmount();
    render(<PasswordGenerator />);

    expect(slider()).toHaveValue("16");
    expect(toggleFor("Digits")).toBeChecked();
    expect(shown()).toHaveLength(16);
    expect(shown()).not.toBe(before);
  });
});
