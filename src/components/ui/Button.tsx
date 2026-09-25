"use client";

import { type ComponentPropsWithRef } from "react";

import { cx } from "@/lib/classNames";

/** The four button weights the approved design draws. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** Button sizes. `md` is the default and needs no modifier class. */
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the width of its container — the narrow-screen layout. */
  block?: boolean;
  /** A round button with an icon and no text. Requires `aria-label`. */
  iconOnly?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string | null> = {
  primary: "o-btn--primary",
  secondary: "o-btn--secondary",
  ghost: "o-btn--ghost",
  danger: "o-btn--danger",
};

const SIZE_CLASS: Record<ButtonSize, string | null> = {
  sm: "o-btn--sm",
  md: null,
  lg: "o-btn--lg",
};

/**
 * The site's button, in the four weights and three sizes of the approved
 * theme.
 *
 * `type` defaults to `"button"`: none of the tools submits a form, and a
 * button that defaults to `submit` is the classic way a converter reloads its
 * own page. Disabled buttons are dimmed by `.o-btn:disabled` in the theme, so
 * "greyed out" is visible rather than only announced — the password generator
 * relies on that when every character type is switched off.
 */
export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  iconOnly = false,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "o-btn",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        block && "o-btn--block",
        iconOnly && "o-btn--icon",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
