import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedSelect, type SegmentedOption } from "./SegmentedSelect";

const UNITS: ReadonlyArray<SegmentedOption<string>> = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
];

function Harness({
  initial = "g",
  options = UNITS,
  onChange,
}: {
  initial?: string;
  options?: ReadonlyArray<SegmentedOption<string>>;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <SegmentedSelect
      label="Convert from"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("SegmentedSelect", () => {
  it("is a radio group whose selected option is exposed as checked", () => {
    render(<Harness />);

    expect(
      screen.getByRole("radiogroup", { name: "Convert from" }),
    ).toHaveClass("t-seg");

    expect(screen.getByRole("radio", { name: "g" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "kg" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "g" })).toHaveClass(
      "t-seg__btn--on",
    );
  });

  it("puts the single tab stop on the selected option", () => {
    render(<Harness />);

    expect(screen.getByRole("radio", { name: "mg" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByRole("radio", { name: "g" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "kg" }));

    expect(onChange).toHaveBeenCalledWith("kg");
    expect(screen.getByRole("radio", { name: "kg" })).toBeChecked();
  });

  it("moves the selection with the arrow keys and takes focus with it", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const group = screen.getByRole("radiogroup");

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("kg");
    expect(screen.getByRole("radio", { name: "kg" })).toHaveFocus();

    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("g");

    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("kg");

    fireEvent.keyDown(group, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("g");
  });

  it("wraps around both ends", () => {
    const onChange = vi.fn();
    render(<Harness initial="kg" onChange={onChange} />);

    const group = screen.getByRole("radiogroup");

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("mg");

    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("kg");
  });

  it("jumps to the ends with Home and End", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const group = screen.getByRole("radiogroup");

    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("kg");

    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("mg");
  });

  it("steps over a disabled option", () => {
    const onChange = vi.fn();
    render(
      <Harness
        initial="mg"
        onChange={onChange}
        options={[
          { value: "mg", label: "mg" },
          { value: "g", label: "g", disabled: true },
          { value: "kg", label: "kg" },
        ]}
      />,
    );

    expect(screen.getByRole("radio", { name: "g" })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });

    expect(onChange).toHaveBeenLastCalledWith("kg");
  });

  it("draws the filled 'to' tone and the stacked layout on request", () => {
    const { container } = render(
      <SegmentedSelect
        label="Convert to"
        tone="to"
        vertical
        options={UNITS}
        value="kg"
        onChange={() => undefined}
      />,
    );

    const group = container.querySelector(".t-seg");

    expect(group).toHaveClass("t-seg--to");
    expect(group).toHaveClass("t-seg--stack");
  });

  it("ignores other keys", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "a" });

    expect(onChange).not.toHaveBeenCalled();
  });
});
