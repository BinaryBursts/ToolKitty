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
import {
  convertTemperature,
  formatTemperature,
  parseTemperatureInput,
  temperatureMessage,
  TEMPERATURE_SCALES,
  type TemperatureScale,
  type TemperatureScaleInfo,
} from "@/lib/temperature";

/**
 * Temperature converter (REQ-6), drawn as the approved temperature converter
 * screen.
 *
 * Like the weight converter, everything the tool knows is three pieces of
 * React state: the text of the field exactly as it was typed, the scale it is
 * in, and the scale it is wanted in. There is no effect, no fetch and no write
 * to storage anywhere in this file — reload the page and the tool is empty
 * again, which is the promise the privacy notice makes on every tool page.
 *
 * The maths, the parsing, the absolute-zero guard and the two-decimal
 * formatting are not here: they are {@link convertTemperature},
 * {@link parseTemperatureInput} and {@link formatTemperature}, proved by their
 * own tests. This component shows what they return, or the message that says
 * why there is nothing to show.
 */

/** The pair the tool opens on, as REQ-6 describes the empty form. */
const DEFAULT_FROM_SCALE: TemperatureScale = "celsius";
const DEFAULT_TO_SCALE: TemperatureScale = "fahrenheit";

/** Shown where a result would be, before there is one. */
const NO_RESULT = "—";

/** Three segments, written out in full: "Celsius (°C)", "Kelvin (K)". */
const SCALE_OPTIONS: ReadonlyArray<SegmentedOption<TemperatureScale>> =
  TEMPERATURE_SCALES.map((scale) => ({
    value: scale.id,
    label: `${scale.label} (${scale.symbol})`,
  }));

/** The scale with this id. Throws for an id no picker can produce. */
function scaleFor(id: TemperatureScale): TemperatureScaleInfo {
  const scale = TEMPERATURE_SCALES.find((candidate) => candidate.id === id);

  if (scale === undefined) {
    throw new RangeError(`Unknown temperature scale: ${id}`);
  }

  return scale;
}

/**
 * How the readout names the scale an answer is in.
 *
 * Celsius and Fahrenheit are degrees; a kelvin is not — it is an absolute unit
 * and is never written "°K", which the screen's own FAQ says in so many words.
 */
function resultScaleName(scale: TemperatureScaleInfo): string {
  return scale.id === "kelvin"
    ? `kelvin (${scale.symbol})`
    : `degrees ${scale.label} (${scale.symbol})`;
}

export function TemperatureConverter() {
  // The raw text, kept exactly as typed: a value that cannot be converted is
  // answered with a message, never by rewriting or clearing the field (REQ-6).
  const [raw, setRaw] = useState("");
  const [fromScale, setFromScale] =
    useState<TemperatureScale>(DEFAULT_FROM_SCALE);
  const [toScale, setToScale] = useState<TemperatureScale>(DEFAULT_TO_SCALE);

  const from = scaleFor(fromScale);
  const to = scaleFor(toScale);

  // Recomputed on every render — which is every keystroke and every scale
  // change — so the result is live with no button to press and nothing to keep
  // in step.
  const parsed = parseTemperatureInput(raw, fromScale);
  const converted =
    parsed.status === "ok"
      ? convertTemperature(parsed.value, fromScale, toScale)
      : null;

  // A value so large that the conversion overflows has no answer to show. It
  // takes three hundred digits to reach, and the formatter refuses a
  // non-finite number rather than print a wrong one, so the readout simply
  // keeps its placeholder.
  const result =
    converted !== null && Number.isFinite(converted)
      ? formatTemperature(converted)
      : null;

  // **Both refusals are worded by the conversion module, not here.** The
  // approved screen draws a longer sentence for the below-absolute-zero case
  // ("That value is below absolute zero. The coldest possible temperature
  // is…"); the shorter wording `src/lib/temperature.ts` already ships is the
  // one confirmed at review of this ticket, so that the two converters
  // complain in one voice and the wording has a single home. The design and
  // the shipped string differ on this one point — do not "correct" the screen
  // back to the drawing without reopening that decision.
  const error =
    parsed.status === "not-a-number" || parsed.status === "below-absolute-zero"
      ? temperatureMessage(parsed.status)
      : null;

  // With no result there is nothing to say a value equals, so the readout names
  // the scale the answer will be in and shows the placeholder instead of a
  // 0.00 that was never converted from anything.
  const readoutLabel =
    result === null
      ? `Result in ${to.label}`
      : `${raw.trim()} ${from.symbol} equals`;

  function reset() {
    setRaw("");
    setFromScale(DEFAULT_FROM_SCALE);
    setToScale(DEFAULT_TO_SCALE);
  }

  function swap() {
    // One update, so the pair is never momentarily the same scale and the
    // result recalculates from the value already in the field.
    setFromScale(toScale);
    setToScale(fromScale);
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
              label="Temperature to convert"
              help="Digits, a decimal point and a leading minus sign. Negative temperatures are ordinary here."
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
                  // Not `decimal`: a phone's decimal pad has no minus key, and
                  // a negative temperature is an ordinary one here.
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0"
                  value={raw}
                  onChange={(event) => {
                    setRaw(event.target.value);
                  }}
                />
                <span className="t-unitcap">{from.symbol}</span>
              </div>
            </Field>

            <div className="o-stack--tight">
              <span className="o-small o-muted">From</span>
              <SegmentedSelect
                label="Convert from"
                options={SCALE_OPTIONS}
                value={fromScale}
                onChange={setFromScale}
              />
            </div>
          </div>

          <SwapButton withRules label="Swap scales" onClick={swap} />

          <div className="t-block o-stack">
            <div className="o-stack--tight">
              <span className="o-small o-muted">To</span>
              <SegmentedSelect
                label="Convert to"
                tone="to"
                options={SCALE_OPTIONS}
                value={toScale}
                onChange={setToScale}
              />
            </div>

            <Readout
              label={readoutLabel}
              value={result ?? NO_RESULT}
              unit={resultScaleName(to)}
              actions={
                <CopyButton
                  value={result ?? ""}
                  label="Copy result"
                  disabled={result === null}
                />
              }
            />

            <p className="o-small o-muted" style={{ margin: 0 }}>
              Always two decimals, negatives included. −40 is the one
              temperature where Celsius and Fahrenheit agree.
            </p>
          </div>
        </div>
      </div>

      <div className="o-section o-grid o-grid--3">
        <div className="t-fact t-fact--sky o-stack--tight">
          <div className="t-fact__value">0 °C = 32.00 °F</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Water freezes. In Kelvin the same point is 273.15 K.
          </p>
        </div>
        <div className="t-fact t-fact--clay o-stack--tight">
          <div className="t-fact__value">98.6 °F = 37.00 °C</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Body temperature, the lookup people reach for most.
          </p>
        </div>
        <div className="t-fact t-fact--mint o-stack--tight">
          <div className="t-fact__value">0 K = -273.15 °C</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Absolute zero — the floor the tool refuses to go under.
          </p>
        </div>
      </div>

      <div className="o-section o-grid o-grid--sidebar">
        <section className="o-stack t-copy">
          <h2 className="o-h2">Common questions</h2>

          <div className="t-faq">
            <h3 className="t-faq__q">Why does Kelvin have no degree sign?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              Because it is an absolute scale: a kelvin is a unit of
              temperature, not a degree above an arbitrary zero. It is written
              273.15 K, never 273.15 °K.
            </p>
          </div>

          <div className="t-faq">
            <h3 className="t-faq__q">Can I pick the same scale twice?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              Yes. Celsius to Celsius simply reformats what you typed to two
              decimals, which is occasionally what you want.
            </p>
          </div>

          <div className="t-faq">
            <h3 className="t-faq__q">Does anything I type get uploaded?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              No. The arithmetic runs in your browser and keeps working with the
              network disconnected. Nothing is remembered between visits —
              reload and the field is empty again.
            </p>
          </div>
        </section>

        <aside className="o-card o-stack">
          <div className="o-card__header">The three scales</div>

          <div className="o-stack--tight">
            <div className="o-spread">
              <span className="o-strong">Celsius (°C)</span>
              <span className="o-small o-muted o-mono">0 / 100</span>
            </div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              Freezing and boiling water at sea level.
            </p>
          </div>
          <div className="o-divider" />

          <div className="o-stack--tight">
            <div className="o-spread">
              <span className="o-strong">Fahrenheit (°F)</span>
              <span className="o-small o-muted o-mono">32 / 212</span>
            </div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              Still the everyday scale in the United States.
            </p>
          </div>
          <div className="o-divider" />

          <div className="o-stack--tight">
            <div className="o-spread">
              <span className="o-strong">Kelvin (K)</span>
              <span className="o-small o-muted o-mono">273.15 / 373.15</span>
            </div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              Absolute, starting at 0 K. Used in science and engineering.
            </p>
          </div>
          <div className="o-divider" />

          <p className="o-small o-muted" style={{ margin: 0 }}>
            ToolKitty keeps no history, no last-used scales and no cookies of
            its own.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default TemperatureConverter;
