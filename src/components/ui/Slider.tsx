"use client";

import { type ComponentPropsWithRef, type ReactNode } from "react";

import { cx } from "@/lib/classNames";

import { useFieldAttributes } from "./fieldContext";

export type SliderProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue"
> & {
  /** Current value. The slider is always controlled — nothing is remembered. */
  value: number;
  /** How the number is written beside the track. Defaults to the number itself. */
  formatValue?: (value: number) => string;
  /**
   * What assistive technology reads instead of the bare number, e.g.
   * "16 characters". Defaults to the formatted value.
   */
  valueText?: string;
  /** Optional scale under the track, e.g. `[8, 24, 40, 64]`. */
  marks?: ReadonlyArray<ReactNode>;
  /** Hide the number beside the track when the caller shows it elsewhere. */
  showValue?: boolean;
};

/**
 * A range slider with its current value in plain sight — the password
 * generator's length control.
 *
 * The number beside the track is `aria-hidden` because the input already
 * carries it: a range input announces its own value, and `aria-valuetext` lets
 * the caller give that value a unit ("16 characters") so it is not read as a
 * bare number. The track's hit area and focus ring come from `.t-range` in the
 * theme, which keeps them the same size in both colour schemes.
 */
export function Slider({
  value,
  formatValue,
  valueText,
  marks,
  showValue = true,
  className,
  ...rest
}: SliderProps) {
  const { attributes } = useFieldAttributes(rest);
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div className={cx("t-slider", className)}>
      <div className="t-slider__row">
        <input
          type="range"
          className="t-range"
          value={value}
          aria-valuetext={valueText ?? display}
          {...attributes}
        />
        {showValue ? (
          <span className="t-slider__value" aria-hidden="true">
            {display}
          </span>
        ) : null}
      </div>

      {marks && marks.length > 0 ? (
        <div className="t-slider__marks o-small o-muted" aria-hidden="true">
          {marks.map((mark, index) => (
            <span key={index}>{mark}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default Slider;
