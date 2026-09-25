"use client";

import { useEffect, useId, useState } from "react";

import {
  Button,
  CloseIcon,
  CopyButton,
  InlineMessage,
  Readout,
  Slider,
} from "@/components/ui";
import { cx } from "@/lib/classNames";
import {
  CHARACTER_CLASSES,
  CHARACTER_SETS,
  DEFAULT_CLASSES,
  enabledClasses,
  generatePassword,
  isSecureRandomAvailable,
  PASSWORD_DEFAULT_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type CharacterClass,
  type CharacterClassToggles,
} from "@/lib/password";

/**
 * Password generator (REQ-7), drawn as the approved password generator screen.
 *
 * The whole tool is four pieces of React state — the length, the four class
 * toggles, the password itself and whether this browser can generate one at
 * all — and one call to {@link generatePassword}. **The password is held in
 * page state and nowhere else**: it is never written to a cookie, to
 * `localStorage` or to `sessionStorage`, never put in the address bar, never
 * logged, never included in an analytics event and never sent over the
 * network. The only copy that leaves this component is the one the visitor
 * asks for, handed to the clipboard by {@link CopyButton}.
 *
 * Two consequences of that promise are visible in the code below and should
 * not be "tidied" away:
 *
 * - **Generation happens in an effect, never during render.** This page is
 *   statically exported, so anything rendered on the server is written into
 *   the HTML every visitor downloads. A password produced during render would
 *   be in that file — the same password for everyone, shipped from a server,
 *   which is precisely what the tool promises never happens. The readout
 *   therefore starts empty and is filled in the browser on mount.
 *
 * - **Nothing is remembered between passwords.** Each press of Generate is an
 *   independent {@link generatePassword} call and replaces what was there; no
 *   history is kept, and reloading the page brings back the defaults.
 *
 * The randomness, the unbiased character selection, the class guarantees and
 * the character sets are not here: they are `@/lib/password`, proved by its own
 * tests. This component chooses settings, shows what that module returns, and
 * says why there is nothing to show when it refuses.
 */

/** Shown where the password goes before the browser has generated one. */
const NO_PASSWORD = "—";

/** Shown when every character class has been turned off (REQ-7). */
export const NO_CLASS_MESSAGE = "Select at least one character type";

/** Shown where the browser has no Web Crypto API; nothing is generated. */
export const UNSUPPORTED_MESSAGE =
  "Secure password generation is not supported in this browser";

/** The scale drawn under the slider track. */
const LENGTH_MARKS: readonly number[] = [
  PASSWORD_MIN_LENGTH,
  24,
  40,
  PASSWORD_MAX_LENGTH,
];

/** How each character class is named on the screen. */
const CLASS_LABELS: Readonly<Record<CharacterClass, string>> = {
  uppercase: "Uppercase",
  lowercase: "Lowercase",
  digits: "Digits",
  symbols: "Symbols",
};

/** The short hint beside each toggle: "A–Z", "0–9", the first few symbols. */
const CLASS_HINTS: Readonly<Record<CharacterClass, string>> = {
  uppercase: "A–Z",
  lowercase: "a–z",
  digits: "0–9",
  symbols: CHARACTER_SETS.symbols.slice(0, 8),
};

/**
 * What the tool has to show: the password itself, and whether this browser can
 * make one at all. They are one piece of state because they change together —
 * a browser that cannot generate has no password to show, and a password that
 * arrives proves the browser can.
 */
type Generated = {
  /** The password on screen, or "" before the browser has made one. */
  readonly password: string;
  /** True where the Web Crypto API is missing; nothing is generated. */
  readonly unsupported: boolean;
};

/** Nothing generated yet: what the server renders, and every fresh mount. */
const NOTHING_GENERATED: Generated = { password: "", unsupported: false };

/**
 * What one attempt at generation came to. Two of the three outcomes keep the
 * password already on screen, so applying an attempt needs to know which.
 */
type Attempt =
  | { readonly kind: "password"; readonly password: string }
  | { readonly kind: "unsupported" }
  | { readonly kind: "no-class" };

/**
 * The length the slider is asking for, made safe to generate with.
 *
 * The range input's `min`, `max` and `step` are what a visitor meets, but the
 * value still arrives as a string from the DOM and is treated as untrusted
 * (REQ-15): anything that is not a whole number in range is brought back into
 * range here rather than handed to {@link generatePassword}, which would throw
 * and be reported as a browser that cannot generate — the wrong message for
 * the wrong reason.
 */
export function safeLength(raw: string): number {
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value)) {
    return PASSWORD_DEFAULT_LENGTH;
  }

  return Math.min(Math.max(value, PASSWORD_MIN_LENGTH), PASSWORD_MAX_LENGTH);
}

/**
 * One attempt at a password for these settings.
 *
 * - No Web Crypto API — generate nothing and say so. There is deliberately no
 *   fallback to a weaker source of randomness (REQ-7).
 * - No character class enabled — nothing to draw from; the screen disables
 *   Generate, says at least one type is needed, and keeps the old password.
 * - Otherwise a fresh, independent password, with no trace of the last one.
 *
 * This is where the randomness is drawn, which is why it is called once in the
 * effect rather than inside the state updater: a `useState` updater has to be
 * pure, and React may run it more than once.
 */
function attemptGeneration(
  length: number,
  classes: CharacterClassToggles,
): Attempt {
  // Asked every time rather than once, so a browser that exposes Web Crypto
  // late — and a test that takes it away — both get an honest answer.
  if (!isSecureRandomAvailable()) {
    return { kind: "unsupported" };
  }

  if (enabledClasses(classes).length === 0) {
    return { kind: "no-class" };
  }

  try {
    return {
      kind: "password",
      password: generatePassword({ length, classes }),
    };
  } catch {
    // With the length already brought into range and a class known to be
    // enabled, the only failure the module has left is the Web Crypto API
    // going away mid-session. The error is not shown verbatim and not logged:
    // nothing that has touched a password is printed anywhere.
    return { kind: "unsupported" };
  }
}

/** What the screen shows once an attempt has been made. Pure. */
function applyAttempt(previous: Generated, attempt: Attempt): Generated {
  switch (attempt.kind) {
    case "password":
      return { password: attempt.password, unsupported: false };
    case "no-class":
      return { ...previous, unsupported: false };
    case "unsupported":
      return { ...previous, unsupported: true };
  }
}

export function PasswordGenerator() {
  const [length, setLength] = useState<number>(PASSWORD_DEFAULT_LENGTH);
  const [classes, setClasses] = useState<CharacterClassToggles>({
    ...DEFAULT_CLASSES,
  });
  const [generated, setGenerated] = useState<Generated>(NOTHING_GENERATED);
  // Bumped by Generate, so pressing it with the settings unchanged is still a
  // change the effect below reacts to — and so generation has one code path.
  const [nonce, setNonce] = useState(0);

  const { password, unsupported } = generated;

  const instanceId = useId();
  const lengthId = `${instanceId}-length`;
  const lengthHelpId = `${instanceId}-length-help`;
  const typesLabelId = `${instanceId}-types`;

  const noneEnabled = enabledClasses(classes).length === 0;

  // Generation lives in an effect on purpose, which is why the "no setState in
  // an effect" rule is turned off for this one line. The rule is about
  // cascading renders; here the extra render *is* the feature. This page is
  // statically exported, so anything produced during render is written into
  // the HTML everybody downloads — one password, shipped from a server, for
  // every visitor. Doing it after mount is what keeps the exported file empty
  // of passwords, and `static-route.test.tsx` fails if that ever stops being
  // true. It runs once on mount and once per change of length, toggles or a
  // press of Generate: one extra render each time, on a keystroke-free path.
  useEffect(() => {
    // Drawn once, here, and only then applied: a state updater must be pure,
    // and this one would otherwise draw a second password under StrictMode.
    const attempt = attemptGeneration(length, classes);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setGenerated((previous) => applyAttempt(previous, attempt));
  }, [length, classes, nonce]);

  /** A fresh, independent password from the settings already on screen. */
  function generate() {
    setNonce((previous) => previous + 1);
  }

  /** Back to how the tool opened: 16 characters, all four classes on. */
  function reset() {
    setLength(PASSWORD_DEFAULT_LENGTH);
    // A new object even when the toggles are already the defaults, so the
    // effect runs and the visitor gets the new password the press implies.
    setClasses({ ...DEFAULT_CLASSES });
  }

  function toggle(name: CharacterClass) {
    setClasses((previous) => ({ ...previous, [name]: !previous[name] }));
  }

  const hasPassword = password !== "";
  const message = unsupported
    ? UNSUPPORTED_MESSAGE
    : noneEnabled
      ? NO_CLASS_MESSAGE
      : null;

  return (
    <div className="o-stack">
      <div className="t-device">
        <div className="t-device__head o-spread">
          <div className="o-row">
            <span className="o-badge o-badge--primary">
              crypto.getRandomValues
            </span>
            <span className="o-small o-muted o-hide-mobile">
              New password on every change
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <CloseIcon size={16} />
            Reset to defaults
          </Button>
        </div>

        <div className="o-stack">
          {/* The password lives in this readout and in React state, and goes
              nowhere else: no storage, no query string, no analytics event, no
              log line, no request. Anything added here that carries the value
              off the page breaks REQ-7's central promise. `Readout` announces
              a new value politely, so a screen-reader user hears each one. */}
          <Readout
            label={
              hasPassword
                ? `Your password · ${String(password.length)} characters`
                : "Your password"
            }
            value={
              <span
                className="o-mono"
                style={{
                  fontSize: "clamp(1.3rem, 4.4vw, 2.6rem)",
                  letterSpacing: "0.01em",
                  // A 64-character password has nowhere to break, so it is
                  // allowed to break anywhere: it wraps inside the card at
                  // 390 px instead of scrolling the page sideways.
                  overflowWrap: "anywhere",
                }}
              >
                {hasPassword ? password : NO_PASSWORD}
              </span>
            }
            actions={
              <div className="o-row">
                <CopyButton
                  value={password}
                  label="Copy password"
                  size="lg"
                  disabled={!hasPassword}
                />
                <Button
                  variant="secondary"
                  onClick={generate}
                  disabled={noneEnabled || unsupported}
                >
                  Generate again
                </Button>
              </div>
            }
          />

          {message === null ? null : (
            <InlineMessage variant="error">{message}</InlineMessage>
          )}

          <div className="o-grid o-grid--sidebar">
            <div className="t-block o-stack">
              <label className="o-label" htmlFor={lengthId}>
                Length
              </label>

              <div className="t-recess" style={{ padding: "10px 18px 12px" }}>
                <Slider
                  id={lengthId}
                  aria-describedby={lengthHelpId}
                  min={PASSWORD_MIN_LENGTH}
                  max={PASSWORD_MAX_LENGTH}
                  step={1}
                  value={length}
                  valueText={`${String(length)} characters`}
                  marks={LENGTH_MARKS}
                  onChange={(event) => {
                    setLength(safeLength(event.target.value));
                  }}
                />
              </div>

              <p className="o-help" id={lengthHelpId} style={{ margin: 0 }}>
                Drag the slider or nudge it with the arrow keys. Sixteen
                characters is the default, and every change makes a new
                password.
              </p>
            </div>

            <div className="t-block o-stack">
              <span className="o-label" id={typesLabelId}>
                Character types
              </span>

              <div
                className="t-seg t-seg--stack"
                role="group"
                aria-labelledby={typesLabelId}
              >
                {CHARACTER_CLASSES.map((name) => (
                  <label
                    key={name}
                    className={cx(
                      "t-seg__btn",
                      "o-spread",
                      classes[name] && "t-seg__btn--on",
                    )}
                  >
                    <span className="o-row" style={{ gap: 10 }}>
                      <input
                        type="checkbox"
                        className="t-toggle"
                        checked={classes[name]}
                        onChange={() => {
                          toggle(name);
                        }}
                      />
                      <span>{CLASS_LABELS[name]}</span>
                    </span>
                    <span className="o-mono o-small">{CLASS_HINTS[name]}</span>
                  </label>
                ))}
              </div>

              <p className="o-help" style={{ margin: 0 }}>
                Each type left on is guaranteed at least one character. Turn all
                four off and Generate is disabled.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="o-section o-grid o-grid--3">
        <div className="t-fact t-fact--mint o-stack--tight">
          <div className="t-fact__value">96 bits</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Roughly the entropy of the default 16 characters across all four
            types.
          </p>
        </div>
        <div className="t-fact t-fact--sky o-stack--tight">
          <div className="t-fact__value">0 requests</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            Generating and copying makes no network call. Disconnect and it
            still works.
          </p>
        </div>
        <div className="t-fact t-fact--clay o-stack--tight">
          <div className="t-fact__value">No history</div>
          <p className="t-fact__note" style={{ margin: 0 }}>
            The previous password is gone the moment you press Generate. Nothing
            is kept.
          </p>
        </div>
      </div>

      <div className="o-section o-grid o-grid--sidebar">
        <section className="o-stack t-copy">
          <h2 className="o-h2">Common questions</h2>

          <div className="t-faq">
            <h3 className="t-faq__q">How long should a password be?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              Sixteen characters with all four types is comfortably beyond brute
              force for anything you will meet in practice. Go to 20 or more for
              a password manager&rsquo;s master password, and only drop to 8
              when a site refuses anything longer.
            </p>
          </div>

          <div className="t-faq">
            <h3 className="t-faq__q">
              Could someone recover a password generated here?
            </h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              Not from us — it exists only in the page&rsquo;s memory, and on
              your clipboard if you copy it. It is never sent over the network,
              never written to storage or a cookie, and never included in an
              analytics event. Closing the tab destroys it.
            </p>
          </div>

          <div className="t-faq">
            <h3 className="t-faq__q">Why is Generate sometimes greyed out?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              Because every character type has been switched off and there is
              nothing to build from. Turn at least one back on and the button
              wakes up; the password already on screen is left untouched in the
              meantime.
            </p>
          </div>

          <div className="t-faq">
            <h3 className="t-faq__q">What about the clipboard afterwards?</h3>
            <p className="o-text o-muted" style={{ margin: 0 }}>
              We do not clear it — the site cannot reach your clipboard once you
              navigate away. Paste the password where it belongs, then copy
              something harmless over it.
            </p>
          </div>
        </section>

        <aside className="o-card o-stack">
          <div className="o-card__header">Character sets used</div>

          {CHARACTER_CLASSES.map((name) => (
            <div className="o-stack--tight" key={name}>
              <span className="o-small o-muted">{CLASS_LABELS[name]}</span>
              <p
                className="o-mono o-small"
                style={{ margin: 0, overflowWrap: "anywhere" }}
              >
                {CHARACTER_SETS[name]}
              </p>
            </div>
          ))}

          <div className="o-divider" />

          <p className="o-small o-muted" style={{ margin: 0 }}>
            Reload the page and the settings are back to 16 characters with all
            four types on — ToolKitty remembers nothing between visits.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default PasswordGenerator;
