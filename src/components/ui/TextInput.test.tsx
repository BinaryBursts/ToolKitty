import { createRef } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("renders a text input in the theme's field style", () => {
    render(<TextInput aria-label="Amount" />);

    const input = screen.getByLabelText("Amount");

    expect(input).toHaveClass("o-input");
    expect(input).toHaveAttribute("type", "text");
  });

  it("passes native props and the ref straight through", () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();

    render(
      <TextInput
        ref={ref}
        aria-label="Amount"
        inputMode="decimal"
        placeholder="0"
        value="12"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Amount");

    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("placeholder", "0");
    expect(input).toHaveValue("12");

    fireEvent.change(input, { target: { value: "13" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps its own description alongside the field's", () => {
    render(
      <>
        <span id="extra">Rounded to two decimals.</span>
        <Field label="Amount" id="amount" help="Numbers only." error="Nope.">
          <TextInput aria-describedby="extra" />
        </Field>
      </>,
    );

    expect(screen.getByLabelText("Amount")).toHaveAttribute(
      "aria-describedby",
      "amount-help amount-error extra",
    );
  });

  it("can be marked invalid on its own, outside a field", () => {
    render(<TextInput aria-label="Amount" aria-invalid />);

    expect(screen.getByLabelText("Amount")).toHaveClass("o-input--error");
  });
});
