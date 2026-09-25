import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WEIGHT_UNITS } from "@/lib/weight";

import { WeightConverter } from "./WeightConverter";

/** The value field. */
const field = (): HTMLInputElement =>
  screen.getByLabelText("Amount to convert") as HTMLInputElement;

/** The big result, as a visitor reads it. */
const readout = (): string =>
  document.querySelector(".t-readout__value")?.textContent ?? "";

/** One of the two unit pickers. */
const picker = (which: "from" | "to"): HTMLElement =>
  screen.getByRole("radiogroup", {
    name: which === "from" ? "Convert from" : "Convert to",
  });

/** Type into the value field, as a keystroke would. */
function type(value: string) {
  fireEvent.change(field(), { target: { value } });
}

/** Pick a unit in one of the pickers by its full "Name (symbol)" label. */
function pickUnit(which: "from" | "to", label: string) {
  fireEvent.click(within(picker(which)).getByRole("radio", { name: label }));
}

/** Put a clipboard on the test's navigator, as CopyButton's own tests do. */
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("WeightConverter", () => {
  it("starts empty, on kilograms to pounds, with no result", () => {
    render(<WeightConverter />);

    expect(field()).toHaveValue("");
    expect(
      within(picker("from")).getByRole("radio", { name: "Kilogram (kg)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Pound (lb)" }),
    ).toBeChecked();

    // A placeholder, not a 0.00 that was never converted from anything.
    expect(readout()).toBe("—");
    expect(readout()).not.toBe("0.00");
  });

  /** REQ-5's acceptance criteria, one row each. */
  it.each([
    { value: "1", from: "Kilogram (kg)", to: "Pound (lb)", shows: "2.20" },
    {
      value: "1",
      from: "Milligram (mg)",
      to: "Kilogram (kg)",
      shows: "0.000001000",
    },
    { value: "1", from: "Troy ounce (ozt)", to: "Gram (g)", shows: "31.10" },
    { value: "1", from: "Ounce (oz)", to: "Gram (g)", shows: "28.35" },
    { value: "14", from: "Pound (lb)", to: "Stone (st)", shows: "1.00" },
  ])("converts $value $from to $shows $to", ({ value, from, to, shows }) => {
    render(<WeightConverter />);

    pickUnit("from", from);
    pickUnit("to", to);
    type(value);

    expect(readout()).toBe(shows);
  });

  it("recalculates on every keystroke, with no button pressed", () => {
    render(<WeightConverter />);

    type("1");
    expect(readout()).toBe("2.20");

    type("12");
    expect(readout()).toBe("26.46");

    type("12.5");
    expect(readout()).toBe("27.56");

    // Clearing the field takes the result away rather than showing 0.00.
    type("");
    expect(readout()).toBe("—");
  });

  it("recalculates from the value already entered when a unit changes", () => {
    render(<WeightConverter />);

    type("1");
    expect(readout()).toBe("2.20");

    pickUnit("to", "Gram (g)");

    expect(field()).toHaveValue("1");
    expect(readout()).toBe("1000.00");
  });

  it("asks for a number when the value is not one, and keeps what was typed", () => {
    render(<WeightConverter />);

    type("abc");

    expect(screen.getByText("Enter a number.")).toBeInTheDocument();
    expect(readout()).toBe("—");
    expect(field()).toHaveValue("abc");
    expect(field()).toHaveAttribute("aria-invalid", "true");
  });

  it("refuses a negative weight, and keeps what was typed", () => {
    render(<WeightConverter />);

    type("-5");

    expect(
      screen.getByText(
        "Enter a weight of zero or more — a negative weight is not meaningful.",
      ),
    ).toBeInTheDocument();
    expect(readout()).toBe("—");
    expect(field()).toHaveValue("-5");
  });

  it("says a value beyond safe precision is out of range", () => {
    render(<WeightConverter />);

    pickUnit("from", "Tonne (t)");
    type("1000000000000");

    expect(screen.getByText(/out of range/)).toBeInTheDocument();
    expect(readout()).toBe("—");
    expect(field()).toHaveValue("1000000000000");
  });

  it("shows a zero as 0.00, which is a result and not an error", () => {
    render(<WeightConverter />);

    type("0");

    expect(readout()).toBe("0.00");
    expect(screen.queryByText("Enter a number.")).not.toBeInTheDocument();
  });

  it("swaps the two units and recalculates, keeping focus on the control", () => {
    render(<WeightConverter />);

    type("1");
    expect(readout()).toBe("2.20");

    const swap = screen.getByRole("button", { name: "Swap the two units" });
    act(() => {
      swap.focus();
    });
    fireEvent.click(swap);

    expect(
      within(picker("from")).getByRole("radio", { name: "Pound (lb)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Kilogram (kg)" }),
    ).toBeChecked();
    expect(field()).toHaveValue("1");
    expect(readout()).toBe("0.45");
    expect(document.activeElement).toBe(swap);
  });

  it("offers all nine units in both pickers, ounce and troy ounce apart", () => {
    render(<WeightConverter />);

    for (const which of ["from", "to"] as const) {
      const options = within(picker(which)).getAllByRole("radio");

      expect(options).toHaveLength(9);

      // Every unit is there under its full name and symbol...
      for (const unit of WEIGHT_UNITS) {
        expect(
          within(picker(which)).getByRole("radio", { name: unit.label }),
        ).toBeInTheDocument();
      }

      // ...including the two ounces, which are never the same option.
      const ounce = within(picker(which)).getByRole("radio", {
        name: "Ounce (oz)",
      });
      const troy = within(picker(which)).getByRole("radio", {
        name: "Troy ounce (ozt)",
      });
      expect(ounce).not.toBe(troy);
    }
  });

  it("copies exactly the number on screen, with no unit symbol", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<WeightConverter />);
    type("1");

    await act(async () => {
      screen.getByRole("button", { name: /Copy result/ }).click();
    });

    expect(writeText).toHaveBeenCalledWith("2.20");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("has nothing to copy until there is a result", () => {
    render(<WeightConverter />);

    expect(screen.getByRole("button", { name: /Copy result/ })).toBeDisabled();

    type("1");
    expect(
      screen.getByRole("button", { name: /Copy result/ }),
    ).not.toBeDisabled();
  });

  it("empties the field and restores the default units on reset", () => {
    render(<WeightConverter />);

    pickUnit("from", "Stone (st)");
    pickUnit("to", "Gram (g)");
    type("3");
    expect(readout()).not.toBe("—");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(field()).toHaveValue("");
    expect(readout()).toBe("—");
    expect(
      within(picker("from")).getByRole("radio", { name: "Kilogram (kg)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Pound (lb)" }),
    ).toBeChecked();
  });

  it("labels the result in words, singular or plural as the number needs", () => {
    render(<WeightConverter />);

    type("1");
    expect(screen.getByText("1 kilogram equals")).toBeInTheDocument();
    expect(screen.getByText("pounds (lb)")).toBeInTheDocument();

    type("2");
    expect(screen.getByText("2 kilograms equal")).toBeInTheDocument();

    pickUnit("from", "US ton (ton)");
    expect(screen.getByText("2 US tons equal")).toBeInTheDocument();
  });
});

/**
 * REQ-5 writes nothing down: no history, no last-used units, no cookie of its
 * own. Nothing in the component can write, so the check is that using it leaves
 * every store exactly as it was found.
 */
describe("WeightConverter persists nothing", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("writes to no storage and sets no cookie while it is used", () => {
    const cookiesBefore = document.cookie;

    render(<WeightConverter />);

    pickUnit("from", "Troy ounce (ozt)");
    pickUnit("to", "Gram (g)");
    type("31");
    fireEvent.click(screen.getByRole("button", { name: "Swap the two units" }));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookiesBefore);
  });

  it("comes back empty on the default pair when the page is loaded again", () => {
    const first = render(<WeightConverter />);

    pickUnit("from", "Gram (g)");
    type("500");
    expect(readout()).not.toBe("—");

    // A reload is a fresh mount with nothing carried over.
    first.unmount();
    render(<WeightConverter />);

    expect(field()).toHaveValue("");
    expect(readout()).toBe("—");
    expect(
      within(picker("from")).getByRole("radio", { name: "Kilogram (kg)" }),
    ).toBeChecked();
    expect(
      within(picker("to")).getByRole("radio", { name: "Pound (lb)" }),
    ).toBeChecked();
  });
});

describe("the screen around the converter", () => {
  it("draws the quick facts the approved screen shows", () => {
    render(<WeightConverter />);

    expect(screen.getByText("1 kg = 2.20 lb")).toBeInTheDocument();
    expect(screen.getByText("14 lb = 1.00 st")).toBeInTheDocument();
    expect(screen.getByText("1 ozt = 31.10 g")).toBeInTheDocument();
  });

  it("answers the three questions the approved screen answers", () => {
    render(<WeightConverter />);

    expect(
      screen.getByRole("heading", { name: "Common questions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Why does a tiny value show more decimals?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Is a troy ounce the same as an ounce?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Does anything I type get uploaded?",
      }),
    ).toBeInTheDocument();
  });
});
