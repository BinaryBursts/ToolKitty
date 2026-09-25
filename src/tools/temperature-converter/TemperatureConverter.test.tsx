import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TEMPERATURE_SCALES } from "@/lib/temperature";

import { TemperatureConverter } from "./TemperatureConverter";

/** The value field. */
const field = (): HTMLInputElement =>
  screen.getByLabelText("Temperature to convert") as HTMLInputElement;

/** The big result, as a visitor reads it. */
const readout = (): string =>
  document.querySelector(".t-readout__value")?.textContent ?? "";

/** One of the two scale pickers. */
const picker = (which: "from" | "to"): HTMLElement =>
  screen.getByRole("radiogroup", {
    name: which === "from" ? "Convert from" : "Convert to",
  });

/** Type into the value field, as a keystroke would. */
function type(value: string) {
  fireEvent.change(field(), { target: { value } });
}

/** Pick a scale in one of the pickers by its "Name (symbol)" label. */
function pickScale(which: "from" | "to", label: string) {
  fireEvent.click(within(picker(which)).getByRole("radio", { name: label }));
}

/** The swap control between the two halves of the converter. */
const swapButton = (): HTMLElement =>
  screen.getByRole("button", { name: "Swap scales" });

/** Put a clipboard on the test's navigator, as CopyButton's own tests do. */
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}

const BELOW_ABSOLUTE_ZERO =
  "That is below absolute zero (-273.15 °C / -459.67 °F / 0 K).";

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("TemperatureConverter", () => {
  it("starts empty, on Celsius to Fahrenheit, with no result", () => {
    render(<TemperatureConverter />);

    expect(field()).toHaveValue("");
    expect(
      within(picker("from")).getByRole("radio", { name: "Celsius (°C)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();

    // A placeholder, not a 0.00 that was never converted from anything.
    expect(readout()).toBe("—");
    expect(screen.queryByText("Enter a number.")).not.toBeInTheDocument();
  });

  it("offers all three scales in both pickers", () => {
    render(<TemperatureConverter />);

    for (const which of ["from", "to"] as const) {
      const options = within(picker(which)).getAllByRole("radio");

      expect(options).toHaveLength(3);

      for (const scale of TEMPERATURE_SCALES) {
        expect(
          within(picker(which)).getByRole("radio", {
            name: `${scale.label} (${scale.symbol})`,
          }),
        ).toBeInTheDocument();
      }
    }
  });

  /** REQ-6's acceptance criteria, one row each. */
  it.each([
    { value: "0", from: "Celsius (°C)", to: "Fahrenheit (°F)", shows: "32.00" },
    {
      value: "100",
      from: "Celsius (°C)",
      to: "Fahrenheit (°F)",
      shows: "212.00",
    },
    {
      value: "-40",
      from: "Celsius (°C)",
      to: "Fahrenheit (°F)",
      shows: "-40.00",
    },
    { value: "0", from: "Celsius (°C)", to: "Kelvin (K)", shows: "273.15" },
    { value: "0", from: "Kelvin (K)", to: "Celsius (°C)", shows: "-273.15" },
    {
      value: "98.6",
      from: "Fahrenheit (°F)",
      to: "Celsius (°C)",
      shows: "37.00",
    },
    { value: "21.5", from: "Celsius (°C)", to: "Celsius (°C)", shows: "21.50" },
  ])("converts $value $from to $shows $to", ({ value, from, to, shows }) => {
    render(<TemperatureConverter />);

    pickScale("from", from);
    pickScale("to", to);
    type(value);

    expect(readout()).toBe(shows);
  });

  it("recalculates on every keystroke, with no button pressed", () => {
    render(<TemperatureConverter />);

    type("1");
    expect(readout()).toBe("33.80");

    type("10");
    expect(readout()).toBe("50.00");

    type("10.5");
    expect(readout()).toBe("50.90");

    // Clearing the field takes the result away rather than showing 32.00.
    type("");
    expect(readout()).toBe("—");
  });

  it("recalculates from the value already entered when a scale changes", () => {
    render(<TemperatureConverter />);

    type("100");
    expect(readout()).toBe("212.00");

    pickScale("to", "Kelvin (K)");

    expect(field()).toHaveValue("100");
    expect(readout()).toBe("373.15");
  });

  it("swaps the two scales and recalculates, keeping focus on the control", () => {
    render(<TemperatureConverter />);

    type("100");
    expect(readout()).toBe("212.00");

    const swap = swapButton();
    act(() => {
      swap.focus();
    });
    fireEvent.click(swap);

    expect(
      within(picker("from")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Celsius (°C)" }),
    ).toBeChecked();
    expect(field()).toHaveValue("100");
    expect(readout()).toBe("37.78");
    expect(document.activeElement).toBe(swap);
  });

  it("asks for a number when the value is not one, and keeps what was typed", () => {
    render(<TemperatureConverter />);

    type("abc");

    expect(screen.getByText("Enter a number.")).toBeInTheDocument();
    expect(readout()).toBe("—");
    expect(field()).toHaveValue("abc");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    // The screen draws a refused field in its error state, not only the
    // message below it.
    expect(field()).toHaveClass("o-input--error");
  });

  it.each([
    { value: "-300", scale: "Celsius (°C)" },
    { value: "-1", scale: "Kelvin (K)" },
    { value: "-460", scale: "Fahrenheit (°F)" },
  ])("refuses $value on $scale as below absolute zero", ({ value, scale }) => {
    render(<TemperatureConverter />);

    pickScale("from", scale);
    type(value);

    expect(screen.getByText(BELOW_ABSOLUTE_ZERO)).toBeInTheDocument();
    expect(readout()).toBe("—");
    expect(field()).toHaveValue(value);
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveClass("o-input--error");
    // A refusal is announced as soon as it replaces a result.
    expect(screen.getByRole("alert")).toHaveTextContent(BELOW_ABSOLUTE_ZERO);
  });

  it("converts absolute zero itself, which is a value and not an error", () => {
    render(<TemperatureConverter />);

    type("-273.15");

    expect(screen.queryByText(BELOW_ABSOLUTE_ZERO)).not.toBeInTheDocument();
    expect(readout()).toBe("-459.67");
  });

  it("points the field's description at the message it is showing", () => {
    render(<TemperatureConverter />);

    type("-300");

    const describedBy = field().getAttribute("aria-describedby") ?? "";
    const described = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

    expect(described).toContain(BELOW_ABSOLUTE_ZERO);
  });

  it("announces the result politely as it changes", () => {
    render(<TemperatureConverter />);

    type("100");

    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toContain("212.00");
  });

  it("names the scales in the readout, with kelvin never a degree", () => {
    render(<TemperatureConverter />);

    type("100");
    expect(screen.getByText("100 °C equals")).toBeInTheDocument();
    expect(screen.getByText("degrees Fahrenheit (°F)")).toBeInTheDocument();

    pickScale("to", "Kelvin (K)");
    expect(screen.getByText("kelvin (K)")).toBeInTheDocument();
  });

  it("copies exactly the number on screen, with no scale symbol", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<TemperatureConverter />);
    type("100");

    await act(async () => {
      screen.getByRole("button", { name: /Copy result/ }).click();
    });

    expect(writeText).toHaveBeenCalledWith("212.00");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("says so when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setClipboard({ writeText });

    render(<TemperatureConverter />);
    type("100");

    await act(async () => {
      screen.getByRole("button", { name: /Copy result/ }).click();
    });

    expect(
      screen.getByText("Copy failed — select and copy manually"),
    ).toBeInTheDocument();
  });

  it("clears the copy confirmation on its own", async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      render(<TemperatureConverter />);
      type("100");

      await act(async () => {
        screen.getByRole("button", { name: /Copy result/ }).click();
      });
      expect(screen.getByText("Copied")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("has nothing to copy until there is a result", () => {
    render(<TemperatureConverter />);

    expect(screen.getByRole("button", { name: /Copy result/ })).toBeDisabled();

    type("100");
    expect(
      screen.getByRole("button", { name: /Copy result/ }),
    ).not.toBeDisabled();
  });

  it("empties the field and restores the default pair on reset", () => {
    render(<TemperatureConverter />);

    pickScale("from", "Kelvin (K)");
    pickScale("to", "Celsius (°C)");
    type("300");
    expect(readout()).not.toBe("—");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(field()).toHaveValue("");
    expect(readout()).toBe("—");
    expect(
      within(picker("from")).getByRole("radio", { name: "Celsius (°C)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();
  });
});

/**
 * Every control is reachable and operable without a mouse: the field, both
 * pickers (one tab stop each, arrow keys along the segments), the swap control
 * and the copy control.
 */
describe("TemperatureConverter on the keyboard alone", () => {
  it("gives each picker one tab stop, on the selected scale", () => {
    render(<TemperatureConverter />);

    for (const which of ["from", "to"] as const) {
      const options = within(picker(which)).getAllByRole("radio");
      const reachable = options.filter(
        (option) => option.getAttribute("tabindex") !== "-1",
      );

      expect(reachable).toHaveLength(1);
      expect(reachable[0]).toBeChecked();
    }
  });

  it("changes the from-scale with an arrow key and recalculates", () => {
    render(<TemperatureConverter />);

    type("100");
    expect(readout()).toBe("212.00");

    fireEvent.keyDown(picker("from"), { key: "ArrowRight" });

    expect(
      within(picker("from")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();
    expect(readout()).toBe("100.00");
  });

  it("swaps with the keyboard, as a button does on Enter and Space", () => {
    render(<TemperatureConverter />);

    type("100");

    const swap = swapButton();
    expect(swap).toHaveAttribute("type", "button");
    // A native button is activated by Enter and Space, which the browser
    // delivers as a click.
    fireEvent.click(swap);

    expect(
      within(picker("from")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();
  });

  it("reaches every control without a mouse, in the order they are read", () => {
    render(<TemperatureConverter />);

    type("100");

    const tabStop = (which: "from" | "to"): HTMLElement => {
      const stops = within(picker(which))
        .getAllByRole("radio")
        .filter((option) => option.getAttribute("tabindex") !== "-1");

      expect(stops).toHaveLength(1);
      return stops[0] as HTMLElement;
    };

    const inTabOrder = [
      field(),
      tabStop("from"),
      swapButton(),
      tabStop("to"),
      screen.getByRole("button", { name: /Copy result/ }),
    ];

    for (const element of inTabOrder) {
      // Native controls are what makes Enter and Space work at all: a `div`
      // with an onClick would pass a focus test and still be dead on the
      // keyboard. Nothing here is disabled or taken out of the tab order.
      expect(["INPUT", "BUTTON"]).toContain(element.tagName);
      expect(element).not.toBeDisabled();
      expect(element.getAttribute("tabindex")).not.toBe("-1");

      act(() => {
        element.focus();
      });
      expect(document.activeElement).toBe(element);
    }

    // Tab follows document order, so document order is the tab order: field,
    // from-scale, swap, to-scale, copy — the order the screen reads in.
    for (let index = 1; index < inTabOrder.length; index += 1) {
      const previous = inTabOrder[index - 1] as Node;
      const current = inTabOrder[index] as Node;

      expect(
        previous.compareDocumentPosition(current) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});

/**
 * REQ-6 writes nothing down: no history, no last-used scales, no cookie of its
 * own. Nothing in the component can write, so the check is that using it leaves
 * every store exactly as it was found.
 */
describe("TemperatureConverter persists nothing", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("writes to no storage and sets no cookie while it is used", () => {
    const cookiesBefore = document.cookie;

    render(<TemperatureConverter />);

    pickScale("from", "Kelvin (K)");
    pickScale("to", "Fahrenheit (°F)");
    type("300");
    fireEvent.click(swapButton());

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookiesBefore);
  });

  it("comes back empty on the default pair when the page is loaded again", () => {
    const first = render(<TemperatureConverter />);

    pickScale("from", "Kelvin (K)");
    type("500");
    expect(readout()).not.toBe("—");

    // A reload is a fresh mount with nothing carried over.
    first.unmount();
    render(<TemperatureConverter />);

    expect(field()).toHaveValue("");
    expect(readout()).toBe("—");
    expect(
      within(picker("from")).getByRole("radio", { name: "Celsius (°C)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Fahrenheit (°F)" }),
    ).toBeChecked();
  });

  it("sends no request anywhere while converting", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    try {
      render(<TemperatureConverter />);

      type("37");
      pickScale("to", "Kelvin (K)");
      fireEvent.click(swapButton());

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("the screen around the converter", () => {
  it("draws the reference points the approved screen shows", () => {
    render(<TemperatureConverter />);

    expect(screen.getByText("0 °C = 32.00 °F")).toBeInTheDocument();
    expect(screen.getByText("98.6 °F = 37.00 °C")).toBeInTheDocument();
    expect(screen.getByText("0 K = -273.15 °C")).toBeInTheDocument();
  });

  it("answers the three questions the approved screen answers", () => {
    render(<TemperatureConverter />);

    expect(
      screen.getByRole("heading", { name: "Common questions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Why does Kelvin have no degree sign?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Can I pick the same scale twice?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Does anything I type get uploaded?",
      }),
    ).toBeInTheDocument();
  });

  it("lists the three scales in the aside", () => {
    render(<TemperatureConverter />);

    expect(screen.getByText("The three scales")).toBeInTheDocument();
    expect(screen.getByText("0 / 100")).toBeInTheDocument();
    expect(screen.getByText("32 / 212")).toBeInTheDocument();
    expect(screen.getByText("273.15 / 373.15")).toBeInTheDocument();
  });
});
