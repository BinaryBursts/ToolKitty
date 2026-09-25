"use client";

import { CloseIcon, Field, SearchIcon, TextInput } from "@/components/ui";

export type ToolSearchProps = {
  /** What the visitor has typed. The directory owns it. */
  value: string;
  /** Called on every keystroke, and with "" when the field is cleared. */
  onChange: (value: string) => void;
  /** Id for the input, so the label and help text point at it. */
  id?: string;
};

/** The help text under the field, also the promise the whole site rests on. */
export const SEARCH_HELP =
  "Filters as you type, on name, description and keywords. The term is never stored or sent.";

/**
 * The homepage's search field (REQ-4).
 *
 * It holds no state of its own: the query lives one level up, in
 * {@link file://./ToolDirectory.tsx}, because the same string decides what the
 * listing shows and whether the featured row is on screen. What the visitor
 * types goes nowhere else — there is no router push, no query parameter, no
 * storage write and no request; clear the field and the page is exactly as it
 * was rendered.
 *
 * Every keystroke filters, with no debounce: the whole registry is a handful
 * of objects already in memory, so there is nothing to wait for.
 */
export function ToolSearch({ value, onChange, id = "tool-search" }: ToolSearchProps) {
  return (
    <Field label="Search tools" help={SEARCH_HELP} id={id} className="t-search">
      <div className="o-search">
        <span className="o-search__icon">
          <SearchIcon />
        </span>

        <TextInput
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Try “temp”, “password”, “kg”…"
          autoComplete="off"
          // The homepage is not a form; a stray Enter must not reload it.
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
        />

        {value === "" ? null : (
          <button
            type="button"
            className="o-btn o-btn--ghost o-btn--icon o-search__clear"
            onClick={() => onChange("")}
            aria-label="Clear the search box"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>
    </Field>
  );
}

export default ToolSearch;
