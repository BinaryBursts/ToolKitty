"use client";

import { type ComponentPropsWithRef } from "react";

import { cx } from "@/lib/classNames";

import { SwapIcon } from "./icons";

export type SwapButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children"
> & {
  /**
   * Accessible name. Defaults to "Swap units"; a tool with something else to
   * swap should say what ("Swap input and output").
   */
  label?: string;
  /** Draw the rules either side, as the converter screens do. */
  withRules?: boolean;
};

/**
 * The round control between the two halves of a converter, which flips the
 * units over without the visitor retyping anything.
 *
 * It is icon-only, so its name is the `aria-label` rather than any text on
 * screen. The rotation on hover lives in the theme and is switched off under
 * `prefers-reduced-motion`, which is why there is no animation here.
 */
export function SwapButton({
  label = "Swap units",
  withRules = false,
  className,
  type = "button",
  ...rest
}: SwapButtonProps) {
  const button = (
    <button
      type={type}
      className={cx("t-swap", className)}
      aria-label={label}
      {...rest}
    >
      <SwapIcon size={22} />
    </button>
  );

  if (!withRules) {
    return button;
  }

  return (
    <div className="t-swapwrap">
      <span className="t-swapline" />
      {button}
      <span className="t-swapline" />
    </div>
  );
}

export default SwapButton;
