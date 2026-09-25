"use client";

import { type ComponentPropsWithRef } from "react";

import { cx } from "@/lib/classNames";

import { useFieldAttributes } from "./fieldContext";

export type SelectProps = ComponentPropsWithRef<"select">;

/**
 * A native `<select>` wearing the theme's `o-select`.
 *
 * Native on purpose: it is the one dropdown that already works with every
 * screen reader, every keyboard and every phone, and it needs no JavaScript of
 * ours. Inside a `<Field>` it takes the field's id, description and error state.
 */
export function Select({ className, children, ...rest }: SelectProps) {
  const { attributes, invalid } = useFieldAttributes(rest);

  return (
    <select
      className={cx("o-select", invalid && "o-input--error", className)}
      {...attributes}
    >
      {children}
    </select>
  );
}

export default Select;
