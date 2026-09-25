import { type ReactNode } from "react";

import { cx } from "@/lib/classNames";

export type ReadoutProps = {
  /** Small uppercase caption above the value, e.g. "1 kilogram equals". */
  label: ReactNode;
  /** The answer itself — the largest thing on the screen. */
  value: ReactNode;
  /** Caption under the value, e.g. "pounds (lb)". */
  unit?: ReactNode;
  /** Set the value in the mono face, for passwords and other literal strings. */
  mono?: boolean;
  /** Controls beside the value, usually a `<CopyButton>`. */
  actions?: ReactNode;
  /**
   * Whether a changed value is announced. Polite by default — the result of a
   * live calculation should reach a screen reader without stealing focus. Set
   * to "off" where the caller announces the change itself.
   */
  live?: "polite" | "off";
  className?: string;
  valueClassName?: string;
};

/**
 * The big result panel every tool ends in.
 *
 * The label, value and unit sit inside one polite live region marked
 * `aria-atomic`, so a recalculated result is read as a whole sentence —
 * "1 kilogram equals 2.20 pounds" — exactly once, instead of a bare number or
 * three separate fragments. The value's `word-break` comes from
 * `.t-readout__value` in the theme, which is what keeps a forty-character
 * password inside the card at 320 px.
 */
export function Readout({
  label,
  value,
  unit,
  mono = false,
  actions,
  live = "polite",
  className,
  valueClassName,
}: ReadoutProps) {
  return (
    <div className={cx("t-readout", className)}>
      <div className="t-readout__row">
        <div
          className="t-readout__main o-stack--tight"
          aria-live={live === "off" ? undefined : "polite"}
          aria-atomic={live === "off" ? undefined : true}
        >
          <span className="t-readout__label">{label}</span>
          <div
            className={cx("t-readout__value", mono && "o-mono", valueClassName)}
          >
            {value}
          </div>
          {unit ? <span className="t-readout__unit">{unit}</span> : null}
        </div>

        {actions ? <div className="t-readout__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export default Readout;
