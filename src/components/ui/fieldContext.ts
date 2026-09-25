"use client";

import { createContext, useContext, type AriaAttributes } from "react";

/**
 * What a `<Field>` tells the control inside it: the id the label points at, the
 * ids of the help and error text, and whether the field is currently in error.
 */
export type FieldControlContext = {
  /** Id the field's `<label for>` points at. */
  id: string;
  /** Space-separated ids of the help and error text, if either is shown. */
  describedBy?: string;
  /** True while the field is showing an error message. */
  invalid: boolean;
};

export const FieldContext = createContext<FieldControlContext | null>(null);

/**
 * The field a control is rendered inside, or `null` when it is used on its own
 * (a search box in a toolbar, say). Controls must work in both cases.
 */
export function useField(): FieldControlContext | null {
  return useContext(FieldContext);
}

/** The accessibility attributes a control accepts from its field. */
type ControlAttributes = {
  id?: string;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

/** `aria-invalid` is not only true/false: "grammar" and "spelling" count too. */
function isInvalid(value: AriaAttributes["aria-invalid"]): boolean {
  return value === true || (typeof value === "string" && value !== "false");
}

/**
 * Merge the control's own props with the surrounding field's.
 *
 * Anything the caller passes explicitly wins; the field only fills the gaps,
 * and `aria-describedby` is merged rather than replaced so a control can add a
 * description of its own without losing the field's help text.
 */
export function useFieldAttributes<T extends ControlAttributes>(
  own: T,
): { attributes: T; invalid: boolean } {
  const field = useField();

  if (!field) {
    return { attributes: own, invalid: isInvalid(own["aria-invalid"]) };
  }

  const describedBy = [field.describedBy, own["aria-describedby"]]
    .filter(Boolean)
    .join(" ");

  const ownInvalid = own["aria-invalid"];
  const invalid =
    ownInvalid === undefined ? field.invalid : isInvalid(ownInvalid);

  return {
    attributes: {
      ...own,
      id: own.id ?? field.id,
      "aria-describedby": describedBy === "" ? undefined : describedBy,
      "aria-invalid": ownInvalid ?? (field.invalid ? true : undefined),
    },
    invalid,
  };
}
