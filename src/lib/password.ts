/**
 * Password generation (REQ-7): the whole of the tool that is not a screen.
 *
 * `generatePassword` takes a length and four character-class toggles and gives
 * back a password. It is a function of its arguments and the browser's
 * cryptographic random number generator, and nothing else: no state is kept
 * between calls, nothing is written to a cookie, to `localStorage` or to
 * `sessionStorage`, nothing is logged, and no network call is made. The
 * password exists as the string this function returns and nowhere else — which
 * is the promise the tool is built on.
 *
 * Three things the requirement asks for need care:
 *
 * - **Randomness is the Web Crypto API and only the Web Crypto API.** Every
 *   random number in this file comes from `crypto.getRandomValues`. The
 *   non-cryptographic generator in the standard library must never appear on
 *   this path; `no-math-random.test.ts` scans the source and fails the build if
 *   it does. Where Web Crypto is missing — a very old browser — nothing is
 *   generated: {@link isSecureRandomAvailable} lets the screen say so rather
 *   than quietly falling back to something weaker.
 *
 * - **Selection is free of modulo bias.** Taking a 32-bit word modulo 24 (the
 *   size of the symbol set) would make the first few symbols very slightly more
 *   likely than the rest, because 2^32 is not a multiple of 24.
 *   {@link randomInt} throws away the words in that unfair tail and draws
 *   again, so every character of every set is exactly as likely as every other.
 *
 * - **Every enabled class appears at least once**, and the guaranteed
 *   characters do not sit at fixed positions: one character is drawn from each
 *   enabled class, the rest are drawn from the union of the enabled sets, and
 *   the whole array is then shuffled with {@link shuffle} — a Fisher-Yates
 *   shuffle driven by the same unbiased draw.
 */

/** Stable identifier of a character class; also its value in the toggles. */
export type CharacterClass = "uppercase" | "lowercase" | "digits" | "symbols";

/**
 * The four classes in the order the screen shows them, and the order the
 * guaranteed characters are drawn in before they are shuffled.
 */
export const CHARACTER_CLASSES: readonly CharacterClass[] = [
  "uppercase",
  "lowercase",
  "digits",
  "symbols",
] as const;

/**
 * The characters each class contributes, exactly as REQ-7 lists them. There is
 * no configurable set and no exclusion of look-alike characters: what a class
 * means is fixed here, so two visitors asking for the same classes draw from
 * the same alphabet.
 */
export const CHARACTER_SETS: Record<CharacterClass, string> = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

/** Which classes a visitor has turned on. */
export type CharacterClassToggles = Record<CharacterClass, boolean>;

/** The shortest password the tool will make (REQ-7). */
export const PASSWORD_MIN_LENGTH = 8;

/** The longest password the tool will make (REQ-7). */
export const PASSWORD_MAX_LENGTH = 64;

/** Where the length slider starts (REQ-7). */
export const PASSWORD_DEFAULT_LENGTH = 16;

/** The toggles a visitor arrives on: all four classes enabled (REQ-7). */
export const DEFAULT_CLASSES: CharacterClassToggles = {
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

/**
 * Thrown when a length outside {@link PASSWORD_MIN_LENGTH} to
 * {@link PASSWORD_MAX_LENGTH} is asked for. The slider cannot produce one, so
 * this is a programming error rather than something a visitor can do.
 */
export class OutOfRangeLengthError extends RangeError {
  constructor(length: number) {
    super(
      `Password length must be a whole number from ${PASSWORD_MIN_LENGTH} to ` +
        `${PASSWORD_MAX_LENGTH}; got ${String(length)}.`,
    );
    this.name = "OutOfRangeLengthError";
  }
}

/**
 * Thrown when every character class is turned off. The screen disables Generate
 * in that state and shows a message instead (REQ-7), so this is the guard
 * behind that rather than the normal path.
 */
export class NoCharacterClassError extends Error {
  constructor() {
    super("At least one character type must be selected.");
    this.name = "NoCharacterClassError";
  }
}

/**
 * Thrown when a password is asked for in a browser with no Web Crypto API.
 * Callers are expected to ask {@link isSecureRandomAvailable} first and show
 * the unsupported-browser message; generation never falls back to a weaker
 * source of randomness.
 */
export class SecureRandomUnavailableError extends Error {
  constructor() {
    super(
      "Secure random generation is not supported in this browser: " +
        "crypto.getRandomValues is unavailable.",
    );
    this.name = "SecureRandomUnavailableError";
  }
}

/** What {@link generatePassword} is asked for. */
export interface PasswordRequest {
  /**
   * How many characters, 8 to 64. Defaults to
   * {@link PASSWORD_DEFAULT_LENGTH}.
   */
  readonly length?: number;
  /** Which classes are enabled. Defaults to {@link DEFAULT_CLASSES}. */
  readonly classes?: CharacterClassToggles;
}

/* -------------------------------------------------------------------------- */
/* Randomness                                                                 */
/* -------------------------------------------------------------------------- */

/** How many distinct values a 32-bit word has: the range one draw covers. */
const WORD_RANGE = 2 ** 32;

/**
 * Can this browser generate a password at all?
 *
 * True only when the Web Crypto API is there and `getRandomValues` is callable.
 * The screen asks before it generates; there is deliberately no fallback.
 */
export function isSecureRandomAvailable(): boolean {
  const source = secureRandomSource();
  return source !== undefined;
}

/**
 * The Web Crypto API, or `undefined` where this browser has none.
 *
 * It is looked up on every call rather than captured once, so a browser that
 * only exposes it late — and a test that replaces it — both see the same
 * function.
 */
function secureRandomSource(): Crypto | undefined {
  const source = (globalThis as { crypto?: Crypto | null }).crypto;
  if (
    source === undefined ||
    source === null ||
    typeof source.getRandomValues !== "function"
  ) {
    return undefined;
  }
  return source;
}

/**
 * One cryptographically random 32-bit word.
 *
 * @throws SecureRandomUnavailableError when the Web Crypto API is missing.
 */
function randomWord(): number {
  const source = secureRandomSource();
  if (source === undefined) {
    throw new SecureRandomUnavailableError();
  }

  const buffer = new Uint32Array(1);
  source.getRandomValues(buffer);

  const word = buffer[0];
  if (word === undefined) {
    // Unreachable with a real Web Crypto implementation, which always fills
    // the array it is handed. Refused rather than defaulted: a password must
    // never be built on a draw that did not happen.
    throw new SecureRandomUnavailableError();
  }

  return word;
}

/**
 * A uniformly distributed whole number from 0 up to but not including
 * `maxExclusive`, with no modulo bias.
 *
 * A 32-bit word has 2^32 values; `maxExclusive` rarely divides that evenly, so
 * the last, incomplete block of values would make the low remainders more
 * likely than the high ones. Every draw at or above the last complete block is
 * therefore discarded and another taken, which leaves each remainder exactly as
 * likely as every other. The loop ends with probability 1, and because the
 * discarded tail is always smaller than `maxExclusive` out of 2^32, a redraw is
 * vanishingly rare for the set sizes this module uses.
 *
 * @throws RangeError if `maxExclusive` is not a whole number from 1 to 2^32.
 * @throws SecureRandomUnavailableError when the Web Crypto API is missing.
 */
export function randomInt(maxExclusive: number): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > WORD_RANGE
  ) {
    throw new RangeError(
      `randomInt needs a whole bound from 1 to 2^32; got ` +
        `${String(maxExclusive)}.`,
    );
  }

  // The first value of the incomplete block: everything from here up is unfair.
  const fairLimit = Math.floor(WORD_RANGE / maxExclusive) * maxExclusive;

  for (;;) {
    const word = randomWord();
    if (word < fairLimit) {
      return word % maxExclusive;
    }
  }
}

/**
 * `items[index]`, with the bound checked rather than asserted away.
 *
 * `noUncheckedIndexedAccess` types every index read as `T | undefined`. Every
 * read below is inside its array by construction, so a miss would be a bug in
 * this module rather than anything a caller can cause — but it is checked, not
 * cast, so that such a bug says what it is instead of leaving a hole in a
 * password.
 */
function elementAt<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) {
    throw new RangeError(
      `Index ${String(index)} is outside an array of ${String(items.length)}.`,
    );
  }
  return value;
}

/**
 * A new array holding the same items in a random order: Fisher-Yates, driven by
 * {@link randomInt} so the shuffle is as unbiased as the draws are. The input
 * is left untouched, and this is the only shuffle the module uses.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const pick = randomInt(index + 1);
    const atIndex = elementAt(shuffled, index);
    shuffled[index] = elementAt(shuffled, pick);
    shuffled[pick] = atIndex;
  }

  return shuffled;
}

/** One character drawn uniformly from `set`, which must not be empty. */
function randomCharacter(set: string): string {
  if (set.length === 0) {
    throw new RangeError("Cannot draw a character from an empty set.");
  }
  return set.charAt(randomInt(set.length));
}

/* -------------------------------------------------------------------------- */
/* The password                                                               */
/* -------------------------------------------------------------------------- */

/** The enabled classes, in {@link CHARACTER_CLASSES} order. */
export function enabledClasses(
  classes: CharacterClassToggles,
): readonly CharacterClass[] {
  return CHARACTER_CLASSES.filter((name) => classes[name]);
}

/**
 * Draw a password of exactly `length` characters from `enabled`, with no
 * opinion about how long a password ought to be.
 *
 * With room for them, every enabled class is guaranteed a character: one is
 * drawn from each, the remaining positions are filled from the union of the
 * enabled sets, and the whole array is then shuffled, so the guaranteed
 * characters are spread through the result rather than sitting at the front.
 *
 * Where `length` is smaller than the number of enabled classes the length wins
 * (REQ-7): a random subset of the enabled classes, as many as fit, contributes
 * one character each. {@link PASSWORD_MIN_LENGTH} is 8 and there are only four
 * classes, so {@link generatePassword} can never reach that branch — it is kept
 * (and tested) here so the rule holds if either number ever changes.
 *
 * @throws RangeError if `length` is below 1.
 * @throws NoCharacterClassError if `enabled` is empty.
 * @throws SecureRandomUnavailableError when the Web Crypto API is missing.
 */
export function drawPassword(
  length: number,
  enabled: readonly CharacterClass[],
): string {
  if (enabled.length === 0) {
    throw new NoCharacterClassError();
  }
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError(
      `A password needs at least one character; got ${String(length)}.`,
    );
  }

  // Fewer positions than classes: as many distinct classes as fit, chosen at
  // random so it is not always the first few.
  if (length < enabled.length) {
    const chosen = shuffle(enabled).slice(0, length);
    const drawn = chosen.map((name) => randomCharacter(CHARACTER_SETS[name]));
    return shuffle(drawn).join("");
  }

  const pool = enabled.map((name) => CHARACTER_SETS[name]).join("");
  const characters = enabled.map((name) =>
    randomCharacter(CHARACTER_SETS[name]),
  );

  while (characters.length < length) {
    characters.push(randomCharacter(pool));
  }

  return shuffle(characters).join("");
}

/**
 * Generate one password: the function the screen calls.
 *
 * The length and the toggles are checked, then {@link drawPassword} composes
 * the result. Each call is independent — nothing is remembered from the last
 * one, and the returned string is the only copy this module makes.
 *
 * @throws OutOfRangeLengthError if `length` is outside 8 to 64.
 * @throws NoCharacterClassError if no class is enabled.
 * @throws SecureRandomUnavailableError when the Web Crypto API is missing.
 */
export function generatePassword(request: PasswordRequest = {}): string {
  const { length = PASSWORD_DEFAULT_LENGTH, classes = DEFAULT_CLASSES } =
    request;

  if (
    !Number.isInteger(length) ||
    length < PASSWORD_MIN_LENGTH ||
    length > PASSWORD_MAX_LENGTH
  ) {
    throw new OutOfRangeLengthError(length);
  }

  return drawPassword(length, enabledClasses(classes));
}
