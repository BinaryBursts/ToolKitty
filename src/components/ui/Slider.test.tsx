import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("renders a range input with its value beside the track", () => {
    render(<Slider aria-label="Password length" min={8} max={64} value={16} />);

    const slider = screen.getByRole("slider", { name: "Password length" });

    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveClass("t-range");
    expect(slider).toHaveValue("16");
    expect(screen.getByText("16")).toHaveClass("t-slider__value");
  });

  it("announces the value with its unit through aria-valuetext", () => {
    render(
      <Slider
        aria-label="Password length"
        min={8}
        max={64}
        value={20}
        valueText="20 characters"
      />,
    );

    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "20 characters",
    );
  });

  it("falls back to the formatted value when no value text is given", () => {
    render(
      <Slider
        aria-label="Indent"
        min={0}
        max={8}
        value={4}
        formatValue={(value) => `${value} spaces`}
      />,
    );

    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "4 spaces",
    );
    expect(screen.getByText("4 spaces")).toBeInTheDocument();
  });

  it("reports a dragged value", () => {
    const onChange = vi.fn();

    render(
      <Slider
        aria-label="Password length"
        min={8}
        max={64}
        value={16}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("slider"), { target: { value: "24" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("draws an optional scale and hides it from assistive technology", () => {
    const { container } = render(
      <Slider aria-label="Length" min={8} max={64} value={8} marks={[8, 64]} />,
    );

    const marks = container.querySelector(".t-slider__marks");

    expect(marks).not.toBeNull();
    expect(marks).toHaveAttribute("aria-hidden", "true");
  });

  it("takes the surrounding field's label", () => {
    render(
      <Field label="Password length" id="pw-length">
        <Slider min={8} max={64} value={16} />
      </Field>,
    );

    expect(
      screen.getByRole("slider", { name: "Password length" }),
    ).toHaveAttribute("id", "pw-length");
  });
});
