import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a textarea in the theme's field style", () => {
    render(<Textarea aria-label="JSON" />);

    const textarea = screen.getByLabelText("JSON");

    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveClass("o-textarea");
    expect(textarea).toHaveAttribute("rows", "8");
  });

  it("accepts a row count and reports what is typed", () => {
    const onChange = vi.fn();

    render(
      <Textarea aria-label="JSON" rows={3} value="{}" onChange={onChange} />,
    );

    const textarea = screen.getByLabelText("JSON");
    expect(textarea).toHaveAttribute("rows", "3");

    fireEvent.change(textarea, { target: { value: '{"a":1}' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("takes the surrounding field's error state", () => {
    render(
      <Field label="JSON" id="json" error="That is not valid JSON.">
        <Textarea />
      </Field>,
    );

    const textarea = screen.getByLabelText("JSON");

    expect(textarea).toHaveAttribute("aria-describedby", "json-error");
    expect(textarea).toHaveClass("o-input--error");
  });
});
