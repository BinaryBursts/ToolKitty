"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "@/lib/classNames";

export type SegmentedOption<T extends string> = {
  /** The value handed back to `onChange`. */
  value: T;
  /** What is written on the segment, e.g. "kg". */
  label: ReactNode;
  /** Optional second line or trailing note, e.g. the character set "A–Z". */
  hint?: ReactNode;
  /** A choice that exists but cannot be picked right now. */
  disabled?: boolean;
};

export type SegmentedSelectProps<T extends string> = {
  /** Accessible name of the group, e.g. "Convert from". */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** The selected value. Always controlled; nothing is remembered. */
  value: T;
  onChange: (value: T) => void;
  /**
   * `"from"` is the light segment of the design, `"to"` the filled one
   * (`t-seg--to`) used for the target unit.
   */
  tone?: "from" | "to";
  /** Stack the segments, as the password generator's character types do. */
  vertical?: boolean;
  className?: string;
};

/** The index of the next selectable option, wrapping around the ends. */
function nextEnabledIndex<T extends string>(
  options: ReadonlyArray<SegmentedOption<T>>,
  from: number,
  step: 1 | -1,
): number {
  const count = options.length;

  for (let moved = 1; moved <= count; moved += 1) {
    const index = (from + step * moved + count * count) % count;
    if (!options[index]?.disabled) {
      return index;
    }
  }

  return from;
}

/** The first — or last — option that can actually be picked. */
function edgeEnabledIndex<T extends string>(
  options: ReadonlyArray<SegmentedOption<T>>,
  edge: "first" | "last",
): number {
  const indexes = options.map((_, index) => index);
  const ordered = edge === "first" ? indexes : indexes.reverse();

  return ordered.find((index) => !options[index]?.disabled) ?? 0;
}

/**
 * Pick one option from a short list of them: the converters' unit pickers, the
 * JSON beautifier's indent scale, the password generator's character types.
 *
 * It is a radio group, not a row of toggle buttons, because that is what it
 * is: one choice out of a few, always exactly one selected. That brings the
 * keyboard behaviour people already expect — Tab reaches the group once and
 * lands on the selected segment, the arrow keys move the selection along it,
 * Home and End jump to the ends — and it means assistive technology reads the
 * chosen unit as "checked" instead of leaving the visitor to infer it from a
 * colour.
 */
export function SegmentedSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "from",
  vertical = false,
  className,
}: SegmentedSelectProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = options.findIndex((option) => option.value === value);
  // With nothing selected yet, Tab should still reach the group: park the tab
  // stop on the first option that can be picked.
  const tabStopIndex =
    selectedIndex >= 0 ? selectedIndex : edgeEnabledIndex(options, "first");

  function select(index: number) {
    const option = options[index];

    if (!option || option.disabled) {
      return;
    }

    buttons.current[index]?.focus();

    if (option.value !== value) {
      onChange(option.value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (options.length === 0) {
      return;
    }

    const from = selectedIndex >= 0 ? selectedIndex : tabStopIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        select(nextEnabledIndex(options, from, 1));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        select(nextEnabledIndex(options, from, -1));
        break;
      case "Home":
        event.preventDefault();
        select(edgeEnabledIndex(options, "first"));
        break;
      case "End":
        event.preventDefault();
        select(edgeEnabledIndex(options, "last"));
        break;
      default:
        break;
    }
  }

  return (
    <div
      className={cx(
        "t-seg",
        tone === "to" && "t-seg--to",
        vertical && "t-seg--stack",
        className,
      )}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={index === tabStopIndex ? 0 : -1}
            className={cx(
              "t-seg__btn",
              selected && "t-seg__btn--on",
              Boolean(option.hint) && "o-spread",
            )}
            onClick={() => {
              select(index);
            }}
          >
            <span>{option.label}</span>
            {option.hint ? (
              <span className="o-mono o-small">{option.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedSelect;
