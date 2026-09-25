import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Readout } from "./Readout";

describe("Readout", () => {
  it("shows the label, the value and the unit", () => {
    render(
      <Readout label="1 kilogram equals" value="2.20" unit="pounds (lb)" />,
    );

    expect(screen.getByText("1 kilogram equals")).toHaveClass(
      "t-readout__label",
    );
    expect(screen.getByText("2.20")).toHaveClass("t-readout__value");
    expect(screen.getByText("pounds (lb)")).toHaveClass("t-readout__unit");
  });

  it("announces a changed result once, politely", () => {
    const { container, rerender } = render(
      <Readout label="1 kilogram equals" value="2.20" unit="pounds (lb)" />,
    );

    const live = container.querySelector("[aria-live]");

    expect(live).toHaveAttribute("aria-live", "polite");
    // One atomic region around label, value and unit: the whole result is read
    // as a sentence, and a single change produces a single announcement.
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
    expect(live).toContainElement(screen.getByText("2.20"));

    rerender(
      <Readout label="2 kilograms equal" value="4.41" unit="pounds (lb)" />,
    );

    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
    expect(screen.getByText("4.41")).toBeInTheDocument();
  });

  it("can be silent when the caller announces the change itself", () => {
    const { container } = render(
      <Readout label="Your password" value="qR7!" live="off" />,
    );

    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("keeps a long value in a breakable block", () => {
    const long = "1234567890123456789012345678901234567890";

    render(<Readout label="A long one" value={long} />);

    // `.t-readout__value` carries word-break: break-word and its column is
    // min-width: 0, which together keep 40 characters inside the card at 320 px.
    expect(screen.getByText(long)).toHaveClass("t-readout__value");
    expect(screen.getByText(long).parentElement).toHaveClass("t-readout__main");
  });

  it("sets a password in the mono face and takes actions beside it", () => {
    render(
      <Readout
        label="Your password"
        value="qR7!vTm2%eXk9Zda"
        mono
        actions={<button type="button">Copy password</button>}
      />,
    );

    expect(screen.getByText("qR7!vTm2%eXk9Zda")).toHaveClass("o-mono");
    expect(
      screen.getByRole("button", { name: "Copy password" }),
    ).toBeInTheDocument();
  });
});
