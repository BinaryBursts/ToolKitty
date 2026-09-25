"use client";

import { type ComponentPropsWithRef } from "react";

import { cx } from "@/lib/classNames";

import { useFieldAttributes } from "./fieldContext";

export type TextInputProps = ComponentPropsWithRef<"input">;

/**
 * A text input wearing the theme's `o-input`.
 *
 * It is a thin wrapper on purpose: every native attribute — `value`,
 * `onChange`, `inputMode`, `ref` — passes straight through, so the tools keep
 * using a plain controlled input and only the look and the field wiring are
 * shared. Inside a `<Field>` it takes the field's id, description and error
 * state automatically.
 */
export function TextInput({ className, type = "text", ...rest }: TextInputProps) {
  const { attributes, invalid } = useFieldAttributes(rest);

  return (
    <input
      type={type}
      className={cx("o-input", invalid && "o-input--error", className)}
      {...attributes}
    />
  );
}

export default TextInput;
