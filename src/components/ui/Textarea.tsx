"use client";

import { type ComponentPropsWithRef } from "react";

import { cx } from "@/lib/classNames";

import { useFieldAttributes } from "./fieldContext";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

/**
 * A multi-line text control wearing the theme's `o-textarea` — the JSON
 * beautifier's input and output panes.
 *
 * As with `<TextInput>`, every native attribute and the ref pass through, and
 * inside a `<Field>` the id, description and error state are wired for it.
 */
export function Textarea({ className, rows = 8, ...rest }: TextareaProps) {
  const { attributes, invalid } = useFieldAttributes(rest);

  return (
    <textarea
      rows={rows}
      className={cx("o-textarea", invalid && "o-input--error", className)}
      {...attributes}
    />
  );
}

export default Textarea;
