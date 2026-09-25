import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";
import { TextInput } from "./TextInput";

describe("Field", () => {
  it("labels the control it wraps, generating an id when none is given", () => {
    render(
      <Field label="Amount to convert">
        <TextInput />
      </Field>,
    );

    const input = screen.getByLabelText("Amount to convert");

    expect(input).toHaveClass("o-input");
    expect(input.id).not.toBe("");
  });

  it("uses the id it is given, so a caller can point at the control", () => {
    render(
      <Field label="Amount" id="weight-amount">
        <TextInput />
      </Field>,
    );

    expect(screen.getByLabelText("Amount")).toHaveAttribute(
      "id",
      "weight-amount",
    );
  });

  it("describes the control with its help text", () => {
    render(
      <Field label="Amount" id="amount" help="Numbers only.">
        <TextInput />
      </Field>,
    );

    const input = screen.getByLabelText("Amount");

    expect(input).toHaveAttribute("aria-describedby", "amount-help");
    expect(screen.getByText("Numbers only.")).toHaveAttribute(
      "id",
      "amount-help",
    );
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveClass("o-input--error");
  });

  it("marks the control invalid and describes it with help and error together", () => {
    render(
      <Field
        label="Amount"
        id="amount"
        help="Numbers only."
        error="Enter a number."
      >
        <TextInput />
      </Field>,
    );

    const input = screen.getByLabelText("Amount");

    expect(input).toHaveAttribute(
      "aria-describedby",
      "amount-help amount-error",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("o-input--error");
    expect(screen.getByText("Enter a number.")).toHaveClass("o-error");
  });

  it("keeps a hidden label in the accessibility tree", () => {
    render(
      <Field label="Search tools" hideLabel>
        <TextInput type="search" />
      </Field>,
    );

    expect(screen.getByLabelText("Search tools")).toBeInTheDocument();
    expect(screen.getByText("Search tools")).toHaveClass("o-sr-only");
  });
});
