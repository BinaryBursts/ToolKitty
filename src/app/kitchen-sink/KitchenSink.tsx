"use client";

import { useState, type ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import {
  Button,
  CopyButton,
  Field,
  InlineMessage,
  Readout,
  SegmentedSelect,
  Select,
  Slider,
  SwapButton,
  Textarea,
  TextInput,
  type SegmentedOption,
} from "@/components/ui";

const WEIGHT_UNITS: ReadonlyArray<SegmentedOption<string>> = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "t", label: "tonne" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "st", label: "stone" },
  { value: "uston", label: "US ton" },
  { value: "ozt", label: "ozt" },
];

const INDENTS: ReadonlyArray<SegmentedOption<string>> = [
  { value: "2", label: "Two spaces", hint: "··" },
  { value: "4", label: "Four spaces", hint: "····" },
  { value: "tab", label: "Tab", hint: "\\t" },
  { value: "minify", label: "Minify", hint: "off", disabled: true },
];

/** A 40-character result, the width test for the readout at 320 px. */
const LONG_VALUE = "1234567890123456789012345678901234567890";

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="o-card o-stack">
      <div className="o-card__header">{title}</div>
      {note ? (
        <p className="o-small o-muted" style={{ margin: 0 }}>
          {note}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Every component of the UI kit, in every state, on one page.
 *
 * This is the page a person opens to check the kit by eye — light and dark, at
 * 320 px and at 1440 px — and to run an accessibility checker over. It is not
 * linked from anywhere and is marked `noindex`.
 */
export function KitchenSink() {
  const [amount, setAmount] = useState("1");
  const [broken, setBroken] = useState("twelve");
  const [notes, setNotes] = useState('{ "hello": "world" }');
  const [from, setFrom] = useState("kg");
  const [to, setTo] = useState("lb");
  const [indent, setIndent] = useState("2");
  const [length, setLength] = useState(16);
  const [category, setCategory] = useState("converters");

  return (
    <Container as="div" className="o-section o-stack">
      <div className="o-stack--tight">
        <span className="o-eyebrow">Internal</span>
        <h1 className="o-h1">UI kit kitchen sink</h1>
        <p className="o-lead">
          Every shared component in every state. Not linked from the site and
          not indexed — it exists so the kit can be checked by eye and by an
          accessibility tool before the tools are built on it.
        </p>
      </div>

      <Block
        title="Buttons"
        note="Four weights, three sizes. The smallest is still a 44 px target."
      >
        <div className="o-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="o-row">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
        <div className="o-row">
          <Button variant="primary" disabled>
            Primary disabled
          </Button>
          <Button variant="secondary" disabled>
            Secondary disabled
          </Button>
          <Button variant="ghost" disabled>
            Ghost disabled
          </Button>
        </div>
        <Button variant="secondary" block>
          Full width
        </Button>
      </Block>

      <Block
        title="Fields"
        note="Label, help text, error state and the swap control."
      >
        <Field label="Amount to convert" help="Numbers only.">
          <TextInput
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
            }}
          />
        </Field>

        <Field
          label="Amount to convert"
          help="Numbers only."
          error="Enter a number — letters cannot be converted."
        >
          <TextInput
            inputMode="decimal"
            value={broken}
            onChange={(event) => {
              setBroken(event.target.value);
            }}
          />
        </Field>

        <Field label="Category" help="A native select, so it works everywhere.">
          <Select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
            }}
          >
            <option value="converters">Converters</option>
            <option value="generators">Generators</option>
            <option value="formatters">Formatters</option>
          </Select>
        </Field>

        <Field
          label="JSON to format"
          help="Paste anything; nothing leaves the browser."
        >
          <Textarea
            value={notes}
            rows={4}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
          />
        </Field>

        <Field
          label="Password length"
          help="Drag it, or nudge it with the arrow keys."
        >
          <Slider
            min={8}
            max={64}
            step={1}
            value={length}
            marks={[8, 24, 40, 64]}
            valueText={`${length} characters`}
            onChange={(event) => {
              setLength(Number(event.target.value));
            }}
          />
        </Field>

        <div className="o-row">
          <SwapButton onClick={() => undefined} />
          <span className="o-small o-muted">Swap control, on its own</span>
        </div>
        <SwapButton withRules onClick={() => undefined} />
      </Block>

      <Block
        title="Segmented selectors"
        note="Tab reaches the group, arrow keys move the selection, Home and End jump to the ends."
      >
        <div className="o-stack--tight">
          <span className="o-small o-muted">From</span>
          <SegmentedSelect
            label="Convert from"
            options={WEIGHT_UNITS}
            value={from}
            onChange={setFrom}
          />
        </div>
        <div className="o-stack--tight">
          <span className="o-small o-muted">To</span>
          <SegmentedSelect
            label="Convert to"
            tone="to"
            options={WEIGHT_UNITS}
            value={to}
            onChange={setTo}
          />
        </div>
        <div className="o-stack--tight">
          <span className="o-small o-muted">
            Stacked, with hints and a disabled option
          </span>
          <SegmentedSelect
            label="Indentation"
            tone="to"
            vertical
            options={INDENTS}
            value={indent}
            onChange={setIndent}
          />
        </div>
      </Block>

      <Block
        title="Readouts and copying"
        note="A result, a 40-character result and a password, each with its copy control."
      >
        <Readout
          label={`${amount || "0"} ${from} equals`}
          value="2.20"
          unit={`pounds (${to})`}
          actions={<CopyButton value="2.20" label="Copy result" />}
        />
        <Readout
          label="A forty-character value"
          value={LONG_VALUE}
          unit="must wrap inside the card at 320 px"
        />
        <Readout
          label={`Your password · ${length} characters`}
          value="qR7!vTm2%eXk9Zda"
          mono
          actions={
            <CopyButton value="qR7!vTm2%eXk9Zda" label="Copy password" />
          }
        />
        <div className="o-row">
          <CopyButton
            value="1 kg = 2.20 lb"
            variant="secondary"
            size="sm"
            label="Copy, small"
          />
          <CopyButton
            value=""
            label="Copy, disabled"
            variant="ghost"
            disabled
          />
        </div>
      </Block>

      <Block title="Inline messages" note="Info, error and empty.">
        <InlineMessage>
          Everything you type here stays in your browser. Nothing is sent to a
          server.
        </InlineMessage>
        <InlineMessage variant="error" title="That temperature is impossible">
          −300 °C is below absolute zero, so there is nothing to convert.
        </InlineMessage>
        <InlineMessage
          variant="empty"
          title="No tools match that search"
          action={<Button variant="secondary">Clear search</Button>}
        >
          Try a shorter word — “convert”, “json”, “password”.
        </InlineMessage>
      </Block>
    </Container>
  );
}

export default KitchenSink;
