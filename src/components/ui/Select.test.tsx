import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { Select } from "./Select";

function options() {
  return (
    <>
      <option value="converters">Converters</option>
      <option value="generators">Generators</option>
    </>
  );
}

describe("Select", () => {
  it("renders a native select in the theme's field style", () => {
    render(
      <Select aria-label="Category" defaultValue="converters">
        {options()}
      </Select>,
    );

    const select = screen.getByLabelText("Category");

    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveClass("o-select");
  });

  it("reports the chosen option", () => {
    const onChange = vi.fn();

    render(
      <Select aria-label="Category" value="converters" onChange={onChange}>
        {options()}
      </Select>,
    );

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "generators" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("takes the surrounding field's id and error state", () => {
    render(
      <Field label="Category" id="category" error="Pick one.">
        <Select defaultValue="converters">{options()}</Select>
      </Field>,
    );

    const select = screen.getByLabelText("Category");

    expect(select).toHaveAttribute("id", "category");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveClass("o-input--error");
  });
});
