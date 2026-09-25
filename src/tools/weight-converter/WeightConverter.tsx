"use client";

import { useState } from "react";

import {
  Button,
  CopyButton,
  Field,
  Readout,
  SegmentedSelect,
  SwapButton,
  TextInput,
  type SegmentedOption,
} from "@/components/ui";
import { formatResult } from "@/lib/formatResult";
import { parseNumericInput } from "@/lib/numericInput";
import {
  convertWeight,
  DEFAULT_FROM_UNIT,
  DEFAULT_TO_UNIT,
  findWeightUnit,
  WEIGHT_UNITS,
  weightConversionMessage,
  type WeightUnit,
  type WeightUnitId,
} from "@/lib/weight";

/**
 * Weight unit converter (REQ-5), drawn as the approved weight converter
 * screen.
 *
 * Everything the tool knows is the three pieces of state below: the text of
 * the field exactly as it was typed, the unit it is in, and the unit it is
 * wanted in. There is no effect, no fetch and no write to storage anywhere in
 * this file — reload the page and the tool is empty again, which is the
 * promise the privacy notice makes on every tool page.
 *
 * The maths, the parsing and the number formatting are not here either: they
 * are {@link convertWeight}, {@link parseNumericInput} and
 * {@link formatResult}, proved by their own tests. This component's job is to
 * show what they return, or the message that says why there is nothing to
 * show.
 */

/**
 * What a segment is written with — short enough that nine of them fit across a
 * phone, as the approved screen draws them. The full name and symbol are the
 * segment's accessible name, so a picker still "shows both" as REQ-5 requires
 * and "Ounce (oz)" is never confused with "Troy ounce (ozt)".
 */
const SEGMENT_LABELS: Record<WeightUnitId, string> = {
  milligram: "mg",
  gram: "g",
  kilogram: "kg",
  tonne: "tonne",
  ounce: "oz",
  pound: "lb",
  stone: "stone",
  "us-ton": "US ton",
  "troy-ounce": "ozt",
};

/** Shown where a result would be, before there is one. */
const NO_RESULT = "—";

const UNIT_OPTIONS: ReadonlyArray<SegmentedOption<WeightUnitId>> =
  WEIGHT_UNITS.map((unit) => ({
    value: unit.id,
    label: (
      <>
        <span aria-hidden="true">{SEGMENT_LABELS[unit.id]}</span>
        <span className="o-sr-only">{unit.label}</span>
      </>
    ),
  }));

/** The unit with this id. Throws for an id no picker can produce. */
function unitFor(id: WeightUnitId): WeightUnit {
  const unit = findWeightUnit(id);

  if (unit === undefined) {
    throw new RangeError(`Unknown weight unit: ${id}`);
  }

  return unit;
}

/**
 * A unit's name as it reads in a sentence: "kilogram", not "Kilogram", but
 * "US ton" left alone — an initialism is not lower-cased.
 */
function sentenceName(unit: WeightUnit): string {
  const [first = "", second = ""] = unit.name;

  return second !== "" && second === second.toLowerCase()
    ? `${first.toLowerCase()}${unit.name.slice(1)}`
    : unit.name;
}

/** Every one of the nine names takes a plain "s": pounds, tonnes, US tons. */
function pluralName(unit: WeightUnit): string {
  return `${sentenceName(unit)}s`;
}

/** "1 kilogram equals", but "2.20 pounds". */
function nameForCount(unit: WeightUnit, count: number): string {
  return Math.abs(count) === 1 ? sentenceName(unit) : pluralName(unit);
}

export function WeightConverter() {
  // The raw text, kept exactly as typed: a value that cannot be converted is
  // answered with a message, never by rewriting or clearing the field (REQ-5).
  const [text, setText] = useState("");
  const [fromUnit, setFromUnit] = useState<WeightUnitId>(DEFAULT_FROM_UNIT);
  const [toUnit, setToUnit] = useState<WeightUnitId>(DEFAULT_TO_UNIT);

  const from = unitFor(fromUnit);
  const to = unitFor(toUnit);

  // Recomputed on every render — which is every keystroke and every unit
  // change — so the result is live with no button to press and nothing to keep
  // in step.
  const parsed = parseNumericInput(text);
  const conversion =
    parsed.kind === "empty" ? null : convertWeight(text, fromUnit, toUnit);

  const converted =
    conversion !== null && conversion.ok ? conversion.value : null;
  const result = converted === null ? null : formatResult(converted);
  const error =
    conversion !== null && !conversion.ok
      ? weightConversionMessage(conversion.reason)
      : null;

  // With no result there is nothing to say a value equals, so the readout names
  // the unit the answer will be in and shows the placeholder instead of a 0.00
  // that was never converted from anything.
  const readoutLabel =
    converted !== null && parsed.kind === "number"
      ? `${text.trim()} ${nameForCount(from, parsed.value)} ${
          Math.abs(parsed.value) === 1 ? "equals" : "equal"
        }`
      : `Result in ${pluralName(to)}`;
  const readoutUnit =
    converted === null
      ? `${pluralName(to)} (${to.symbol})`
      : `${nameForCount(to, converted)} (${to.symbol})`;

  function reset() {
    setText("");
    setFromUnit(DEFAULT_FROM_UNIT);
    setToUnit(DEFAULT_TO_UNIT);
  }

  function swap() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }

  return (
    <div className="o-stack">
      <div className="t-device">
        <div className="t-device__head o-spread">
          <div className="o-row">
            <span className="o-badge o-badge--primary">Live result</span>
            <span className="o-small o-muted o-hide-mobile">
              Works offline once loaded
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>

        <div className="o-stack">
          <div className="t-block o-stack">
            <Field
              label="Amount to convert"
              help={
                <>
                  Numbers only. Negative weights and values above 1e15&nbsp;g
                  are rejected with a message.
                </>
              }
              // `role="alert"` so a refusal replacing a result is spoken as
              // soon as it appears; `aria-describedby` alone is only read when
              // focus next enters the field.
              error={error === null ? null : <span role="alert">{error}</span>}
            >
              <div
                className="t-recess o-row"
                style={{ gap: 8, flexWrap: "nowrap", alignItems: "center" }}
              >
                <TextInput
                  className="o-grow"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                  }}
                />
                <span className="t-unitcap">{from.symbol}</span>
              </div>
            </Field>

            <div className="o-stack--tight">
              <span className="o-small o-muted">From</span>
              <SegmentedSelect
                label="Convert from"
                options={UNIT_OPTIONS}
                value={fromUnit}
                onChange={setFromUnit}
              />
              <span className="o-small o-muted">{from.label} selected</span>
            </div>
          </div>

          <SwapButton withRules label="Swap the two units" onClick={swap} />

          <div className="t-block o-stack">
            <div className="o-stack--tight">
              <span className="o-small o-muted">To</span>
              <SegmentedSelect
                label="Convert to"
                tone="to"
                options={UNIT_OPTIONS}
                value={toUnit}
                onChange={setToUnit}
              />
            </div>

            <Readout
              label={readoutLabel}
              value={result ?? NO_RESULT}
              unit={readoutUnit}
              actions={
                <CopyButton
                  value={result ?? ""}
                  label="Copy result"
                  disabled={result === null}
                />
              }
            />

            <p className="o-small o-muted" style={{ margin: 0 }}>
              Shown to two decimals. Values under 0.01 switch to four
              significant figures — 1&nbsp;mg to kg reads 0.000001000, never
              0.00.
            </p>
          </div>
        </div>
      </div>

      <div className="o-section o-grid o-grid--3">
        <div className="t-fact t-fact--mint o-stack--tight">
          <div className="t-fact__value">1 kg = 2.20 lb</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Kilograms to pounds is the pair people look up most.
          </p>
        </div>
        <div className="t-fact t-fact--sky o-stack--tight">
          <div className="t-fact__value">14 lb = 1.00 st</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            A stone is exactly fourteen pounds, or 6350.29 g.
          </p>
        </div>
        <div className="t-fact t-fact--clay o-stack--tight">
          <div className="t-fact__value">1 ozt = 31.10 g</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Troy ounces price gold and silver — heavier than an ordinary ounce
            (28.35 g).
          </p>
        </div>
      </div>

      <section className="o-section o-stack t-copy">
        <h2 className="o-h2">Common questions</h2>

        <div className="t-faq">
          <h3 className="t-faq__q">
            Why does a tiny value show more decimals?
          </h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            Because two decimals would round it away to nothing. Below 0.01 the
            result switches to four significant figures, so a milligram in
            kilograms still reads 0.000001000.
          </p>
        </div>

        <div className="t-faq">
          <h3 className="t-faq__q">Is a troy ounce the same as an ounce?</h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            No. A troy ounce is 31.1034768 g and is used for precious metals;
            the everyday ounce is 28.349523125 g. Both are listed separately so
            a gold weight is never converted with the wrong one.
          </p>
        </div>

        <div className="t-faq">
          <h3 className="t-faq__q">Does anything I type get uploaded?</h3>
          <p className="o-text o-muted" style={{ margin: 0 }}>
            No. The whole calculation runs in your browser and keeps working
            with the network disconnected. Nothing is remembered between visits
            — no history, no last-used units.
          </p>
        </div>
      </section>
    </div>
  );
}

export default WeightConverter;
