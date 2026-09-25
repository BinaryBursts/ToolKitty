"use client";

import { useId, type ReactNode } from "react";

import { cx } from "@/lib/classNames";

import { FieldContext, type FieldControlContext } from "./fieldContext";

export type FieldProps = {
  /** Visible label. Always present — a control without one is not a field. */
  label: ReactNode;
  /** The control: a `<TextInput>`, `<Select>`, `<Textarea>` or `<Slider>`. */
  children: ReactNode;
  /**
   * Id for the control. One is generated when it is left out, so a field can
   * be dropped anywhere without the caller inventing unique ids.
   */
  id?: string;
  /** Guidance shown under the control, wired up as `aria-describedby`. */
  help?: ReactNode;
  /** Error message. Its presence is what puts the control into the error state. */
  error?: ReactNode;
  /** Extra classes on the field wrapper. */
  className?: string;
  /**
   * Render the label visually hidden (it stays in the accessibility tree).
   * For the rare control whose purpose is obvious from its surroundings.
   */
  hideLabel?: boolean;
};

/**
 * A labelled form control with optional help and error text.
 *
 * Field owns the wiring the four tools would otherwise repeat: the label's
 * `for`, the control's `id`, the `aria-describedby` that points at the help and
 * error text, and the `aria-invalid` and `o-input--error` that mark the control
 * when something is wrong. The control picks all of that up through context, so
 * a caller writes the control exactly as it would on its own:
 *
 * ```tsx
 * <Field label="Amount to convert" help="Numbers only." error={error}>
 *   <TextInput inputMode="decimal" value={value} onChange={onChange} />
 * </Field>
 * ```
 */
export function Field({
  label,
  children,
  id,
  help,
  error,
  className,
  hideLabel = false,
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const helpId = `${controlId}-help`;
  const errorId = `${controlId}-error`;

  const describedBy = [help ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const context: FieldControlContext = {
    id: controlId,
    describedBy: describedBy === "" ? undefined : describedBy,
    invalid: Boolean(error),
  };

  return (
    <div className={cx("o-field", className)}>
      <label
        className={cx("o-label", hideLabel && "o-sr-only")}
        htmlFor={controlId}
      >
        {label}
      </label>

      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>

      {help ? (
        <p className="o-help" id={helpId}>
          {help}
        </p>
      ) : null}

      {error ? (
        <p className="o-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default Field;
